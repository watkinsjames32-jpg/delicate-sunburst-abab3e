/**
 * PayPal checkout through the Orders v2 REST API — the store's third way to
 * take a payment, and the only one where this site delivers the order itself.
 *
 * "Pay with PayPal" posts the SKU (and size) to `/api/paypal/checkout`, which
 * creates a PayPal order at the catalog price, records it in the database and
 * sends the buyer to PayPal to approve it. PayPal then returns them to
 * `/api/paypal/return`, which captures the payment and forwards them to their
 * order page: a download for singles, a shipping confirmation for merch.
 *
 * Needs, from the environment:
 *
 *   PAYPAL_CLIENT_ID      the REST app's Client ID
 *   PAYPAL_CLIENT_SECRET  the REST app's Secret (LONDONKOI_PAYPAL_CLIENT_SECRET
 *                         and the other names in CLIENT_SECRET_NAMES also work)
 *   PAYPAL_ENV            optional, `sandbox` to test; anything else is live
 *   PAYPAL_SHIPPING_USD   optional flat shipping charge on merch, e.g. `6.50`
 *   PAYPAL_PAYEE_EMAIL    optional PayPal account the money is paid into;
 *                         defaults to DEFAULT_PAYEE_EMAIL (Tomeka Jones)
 *
 * Server-only: it reads `process.env` and holds the client secret. Never
 * import it from a component.
 */

import type { Purchasable } from '../data/catalog'
import { readEnv, readEnvsWithPrefix } from './env'

/** Checkout waits on this, so a slow PayPal fails fast rather than hanging. */
const REQUEST_TIMEOUT_MS = 10000

const CURRENCY = 'USD'

/**
 * The PayPal account every order pays into — Tomeka Jones's business account.
 * Named as the order's payee, so the money lands there even when the REST app
 * whose credentials sign the requests belongs to a different PayPal account.
 */
export const DEFAULT_PAYEE_EMAIL = 'reneegreen96@yahoo.com'

/** Where payments go: PAYPAL_PAYEE_EMAIL when it looks like an email, else the default. */
export function payeeEmail(): string {
  const value = readEnv('PAYPAL_PAYEE_EMAIL')
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : DEFAULT_PAYEE_EMAIL
}

type PaypalConfig = {
  apiBase: string
  clientId: string
  clientSecret: string
}

/**
 * Names the REST app's credentials may be saved under, most conventional
 * first. The Londonkoi app's secret is stored as LONDONKOI_PAYPAL_CLIENT_SECRET
 * rather than PAYPAL_CLIENT_SECRET, and there is a second Client ID beside it.
 */
const CLIENT_ID_NAMES = ['PAYPAL_CLIENT_ID', 'PAYPAL_LONDONKOI_CLIENT_ID', 'LONDONKOI_PAYPAL_CLIENT_ID']
const CLIENT_SECRET_NAMES = [
  'PAYPAL_CLIENT_SECRET',
  // An existing Netlify setting was saved with this typo. Prefer the standard
  // name above, but keep checkout working until the setting can be renamed.
  'PAYPAL_CLIENT_SRCRET',
  'LONDONKOI_PAYPAL_CLIENT_SECRET',
  'PAYPAL_LONDONKOI_CLIENT_SECRET',
  'PAYPAL_SECRET',
]

function presentValues(names: string[]): string[] {
  const values = names.map((name) => readEnv(name)).filter((value): value is string => Boolean(value))
  return [...new Set(values)]
}

/**
 * Client IDs from the exact names first, then from any variable whose name
 * merely starts with one of them — the Londonkoi Client ID was saved as
 * `PAYPAL_CLIENT_ID_<extra characters>`, which an exact lookup never finds.
 */
function clientIds(): string[] {
  return [...new Set([...presentValues(CLIENT_ID_NAMES), ...CLIENT_ID_NAMES.flatMap(readEnvsWithPrefix)])]
}

/**
 * Every Client ID / Secret pair the environment could mean, in order of
 * preference. Usually just one; when there are several, sign-in keeps the first
 * pair PayPal accepts.
 */
function paypalConfigs(): PaypalConfig[] {
  const mode = (readEnv('PAYPAL_ENV') ?? readEnv('PAYPAL_MODE') ?? 'live').toLowerCase()
  const apiBase = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
  const secrets = presentValues(CLIENT_SECRET_NAMES)

  return clientIds().flatMap((clientId) =>
    secrets.map((clientSecret) => ({ apiBase, clientId, clientSecret })),
  )
}

export function paypalConfigured(): boolean {
  return paypalConfigs().length > 0
}

/** Which settings are present, for logs. Never includes the values. */
export function describePaypalSetup(): Record<string, boolean> {
  return {
    ...Object.fromEntries(
      [...CLIENT_ID_NAMES, ...CLIENT_SECRET_NAMES, 'PAYPAL_PAYEE_EMAIL'].map((name) => [
        name,
        Boolean(readEnv(name)),
      ]),
    ),
    'PAYPAL_CLIENT_ID_* (other names)': CLIENT_ID_NAMES.some((name) => readEnvsWithPrefix(name).length > 0),
  }
}

/** Flat shipping added to merch orders, in cents. Zero when unset or unreadable. */
export function merchShippingCents(): number {
  const value = readEnv('PAYPAL_SHIPPING_USD')?.replace(/^\$/, '')
  if (!value) return 0
  const dollars = Number(value)
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0
}

function money(cents: number) {
  return { currency_code: CURRENCY, value: (cents / 100).toFixed(2) }
}

function centsFrom(value: string | undefined): number | null {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) : null
}

export class PaypalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issue: string | null,
  ) {
    super(message)
  }
}

/** How long a failed sign-in is remembered, so a bad secret isn't retried on every page view. */
const SIGN_IN_RETRY_MS = 60_000

/** One cached token per set of credentials, reused until shortly before PayPal expires it. */
let cachedToken: { key: string; token: string; expiresAt: number } | null = null
const failedSignIns = new Map<string, { error: PaypalError; until: number }>()

/**
 * Signs in with the first configured credential pair PayPal accepts. Only
 * rejected credentials move on to the next pair; any other failure (PayPal
 * down, timeout) is thrown straight away.
 */
async function accessToken(): Promise<{ token: string; config: PaypalConfig }> {
  const configs = paypalConfigs()
  if (configs.length === 0) throw new PaypalError('PayPal is not configured', 503, null)

  let rejected: PaypalError | null = null
  for (const config of configs) {
    try {
      return { token: await signIn(config), config }
    } catch (error) {
      if (!(error instanceof PaypalError) || error.issue !== 'INVALID_CREDENTIALS') throw error
      rejected = error
    }
  }
  if (configs.length > 1) {
    throw new PaypalError(
      `PayPal rejected all ${configs.length} configured Client ID / Secret pairs for ${configs[0].apiBase}`,
      401,
      'INVALID_CREDENTIALS',
    )
  }
  throw rejected
}

async function signIn(config: PaypalConfig): Promise<string> {
  const key = `${config.apiBase}|${config.clientId}|${config.clientSecret}`
  const now = Date.now()
  if (cachedToken?.key === key && cachedToken.expiresAt > now) return cachedToken.token
  const failed = failedSignIns.get(key)
  if (failed && failed.until > now) throw failed.error

  const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    // 401 means PayPal doesn't recognise the Client ID / Secret pair — usually
    // a placeholder, a sandbox app used live (or the reverse), or a stray space.
    const error = new PaypalError(
      response.status === 401
        ? `PayPal rejected PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET for ${config.apiBase} — check they are the REST app's ${config.apiBase.includes('sandbox') ? 'sandbox' : 'Live'} credentials`
        : `PayPal sign-in failed (${response.status})`,
      response.status,
      response.status === 401 ? 'INVALID_CREDENTIALS' : null,
    )
    if (response.status === 401) failedSignIns.set(key, { error, until: now + SIGN_IN_RETRY_MS })
    throw error
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) throw new PaypalError('PayPal sign-in returned no token', 502, null)

  const lifetimeMs = (body.expires_in ?? 0) * 1000
  cachedToken = { key, token: body.access_token, expiresAt: now + Math.max(0, lifetimeMs - 60_000) }
  failedSignIns.delete(key)
  return body.access_token
}

/**
 * True when PayPal accepts the configured credentials. The store page asks this
 * before offering "Pay with PayPal", so bad credentials hide the button instead
 * of failing at checkout. Uses the cached token, so it rarely calls PayPal.
 */
export async function paypalReady(): Promise<boolean> {
  if (!paypalConfigured()) return false
  try {
    await accessToken()
    return true
  } catch (error) {
    console.error('PayPal is configured but unavailable:', error instanceof Error ? error.message : error)
    return false
  }
}

async function paypalRequest<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown; requestId?: string },
): Promise<T> {
  const { token, config } = await accessToken()
  const response = await fetch(`${config.apiBase}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // The full order, so captures include the payee they were paid to.
      Prefer: 'return=representation',
      ...(init.requestId ? { 'PayPal-Request-Id': init.requestId } : {}),
    },
    body: init.method === 'POST' ? JSON.stringify(init.body ?? {}) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const body = (await response.json().catch(() => null)) as
    | (T & { details?: { issue?: string }[] })
    | null
  if (!response.ok) {
    const issue = body?.details?.[0]?.issue ?? null
    throw new PaypalError(`PayPal ${path} failed (${response.status})`, response.status, issue)
  }
  return body as T
}

type CreatedOrder = {
  id: string
  links?: { rel: string; href: string }[]
}

export type NewPaypalOrder = {
  paypalOrderId: string
  approveUrl: string
  itemCents: number
  shippingCents: number
  totalCents: number
}

/**
 * Creates a PayPal order for one item at the catalog price and returns where to
 * send the buyer to approve it. Merch asks PayPal to collect a shipping
 * address; singles skip it.
 */
export async function createPaypalOrder(
  item: Purchasable,
  size: string | undefined,
  options: { origin: string; requestId: string },
): Promise<NewPaypalOrder> {
  const isMerch = item.kind === 'merch'
  const itemCents = item.priceCents
  const shippingCents = isMerch ? merchShippingCents() : 0
  const totalCents = itemCents + shippingCents
  const name = size ? `${item.title} (${size})` : item.title

  const order = await paypalRequest<CreatedOrder>('/v2/checkout/orders', {
    method: 'POST',
    requestId: options.requestId,
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: item.sku,
          payee: { email_address: payeeEmail() },
          description: `London Koi — ${name}`.slice(0, 127),
          amount: {
            ...money(totalCents),
            breakdown: { item_total: money(itemCents), shipping: money(shippingCents) },
          },
          items: [
            {
              name: name.slice(0, 127),
              sku: size ? `${item.sku}-${size}` : item.sku,
              quantity: '1',
              unit_amount: money(itemCents),
              category: isMerch ? 'PHYSICAL_GOODS' : 'DIGITAL_GOODS',
            },
          ],
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'London Koi',
            shipping_preference: isMerch ? 'GET_FROM_FILE' : 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${options.origin}/api/paypal/return`,
            cancel_url: `${options.origin}/music`,
          },
        },
      },
    },
  })

  const approveUrl = order.links?.find((link) => link.rel === 'payer-action')?.href
  if (!approveUrl) throw new PaypalError('PayPal returned no approval link', 502, null)

  return { paypalOrderId: order.id, approveUrl, itemCents, shippingCents, totalCents }
}

type OrderDetails = {
  id: string
  status: string
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } }
  purchase_units?: {
    payee?: { email_address?: string }
    shipping?: { name?: { full_name?: string }; address?: Record<string, string> }
    payments?: {
      captures?: { id: string; status: string; amount?: { value?: string; currency_code?: string } }[]
    }
  }[]
}

export type CapturedPayment = {
  /** True only when the money has actually moved. */
  paid: boolean
  /** PayPal's capture status, e.g. COMPLETED or PENDING. */
  captureStatus: string | null
  captureId: string | null
  amountCents: number | null
  currency: string | null
  buyerName: string | null
  buyerEmail: string | null
  shippingAddress: Record<string, string> | null
  /** The PayPal account PayPal says it paid, when it says. */
  payeeEmail: string | null
}

/** True unless PayPal reports paying an account other than payeeEmail(). */
export function paidToPayee(payment: CapturedPayment): boolean {
  return !payment.payeeEmail || payment.payeeEmail.toLowerCase() === payeeEmail().toLowerCase()
}

function summarise(order: OrderDetails): CapturedPayment {
  const unit = order.purchase_units?.[0]
  const capture = unit?.payments?.captures?.[0]
  const payerName = [order.payer?.name?.given_name, order.payer?.name?.surname]
    .filter(Boolean)
    .join(' ')
  const shipTo = unit?.shipping

  return {
    paid: capture?.status === 'COMPLETED',
    captureStatus: capture?.status ?? null,
    captureId: capture?.id ?? null,
    amountCents: centsFrom(capture?.amount?.value),
    currency: capture?.amount?.currency_code ?? null,
    buyerName: shipTo?.name?.full_name ?? (payerName || null),
    buyerEmail: order.payer?.email_address ?? null,
    shippingAddress: shipTo?.address ?? null,
    payeeEmail: unit?.payee?.email_address ?? null,
  }
}

/**
 * Captures an approved order. Safe to repeat: a second attempt on an order
 * already captured reads it back instead of failing.
 */
export async function capturePaypalOrder(paypalOrderId: string): Promise<CapturedPayment> {
  const path = `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`
  try {
    const order = await paypalRequest<OrderDetails>(`${path}/capture`, {
      method: 'POST',
      requestId: `capture-${paypalOrderId}`,
    })
    return summarise(order)
  } catch (error) {
    if (error instanceof PaypalError && error.issue === 'ORDER_ALREADY_CAPTURED') {
      return summarise(await paypalRequest<OrderDetails>(path, { method: 'GET' }))
    }
    throw error
  }
}

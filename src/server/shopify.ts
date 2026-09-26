/**
 * Shopify checkout through the Storefront API — the store's other way to take
 * a payment, and the one that keeps the buyer on this site until they pay.
 *
 * "Buy on Shopify" posts the SKU (and size) to `/api/checkout`, which looks up
 * the matching product variant here, creates a one-line Shopify cart and sends
 * the buyer to that cart's hosted checkout. Shopify then takes the payment,
 * collects the shipping address, charges its own price and shipping rates, and
 * handles the receipt and fulfilment from the Shopify admin.
 *
 * Needs, from the environment:
 *
 *   SHOPIFY_STORE_DOMAIN             e.g. `koi-ware.myshopify.com`
 *   SHOPIFY_STOREFRONT_ACCESS_TOKEN  the public Storefront API token, or
 *   SHOPIFY_STOREFRONT_PRIVATE_TOKEN the private one (preferred if both are set)
 *   SHOPIFY_API_VERSION              optional, defaults to `DEFAULT_API_VERSION`
 *
 * Each SKU is matched to the Shopify product whose handle is, first match wins,
 * `SHOPIFY_HANDLE_<SKU>` from the environment, `shopifyHandle` in `catalog.ts`,
 * or the SKU itself.
 *
 * Server-only: it reads `process.env` and holds the access token. Never import
 * it from a component.
 */

import { findPurchasable, type Purchasable } from '../data/catalog'
import { readEnv, readItemEnv } from './env'

/**
 * A stable Storefront API release. Shopify keeps each version for about a year
 * and then serves the oldest supported one instead, so an old default degrades
 * gracefully; set `SHOPIFY_API_VERSION` to move forward without a deploy.
 */
const DEFAULT_API_VERSION = '2026-01'

/** Checkout waits on this, so a slow Shopify fails fast rather than hanging the page. */
const REQUEST_TIMEOUT_MS = 8000

type ShopifyConfig = {
  endpoint: string
  token: string
  /** Private tokens use a different header and want the buyer's IP alongside. */
  isPrivate: boolean
}

/**
 * The shop's `*.myshopify.com` host, accepting the forms it tends to be pasted
 * in: a bare shop name, the full host, a storefront URL, or the
 * `admin.shopify.com/store/<name>` address the admin shows.
 */
function storeHost(value: string | null): string | null {
  if (!value) return null

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (host === 'admin.shopify.com') {
    const shop = url.pathname.match(/^\/store\/([a-z0-9-]+)/i)?.[1]
    return shop ? `${shop.toLowerCase()}.myshopify.com` : null
  }
  if (!host.includes('.')) return `${host}.myshopify.com`
  return host
}

function shopifyConfig(): ShopifyConfig | null {
  const host = storeHost(readEnv('SHOPIFY_STORE_DOMAIN'))
  const privateToken = readEnv('SHOPIFY_STOREFRONT_PRIVATE_TOKEN')
  const publicToken = readEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN')
  const token = privateToken ?? publicToken
  if (!host || !token) return null

  const version = readEnv('SHOPIFY_API_VERSION') ?? DEFAULT_API_VERSION
  return {
    endpoint: `https://${host}/api/${version}/graphql.json`,
    token,
    isPrivate: Boolean(privateToken),
  }
}

/** True when the store domain and a Storefront token are both set. */
export function shopifyConfigured(): boolean {
  return shopifyConfig() !== null
}

/**
 * Which setting is missing, for the server log when checkout cannot start.
 * Names only — never the values.
 */
export function describeShopifySetup(): Record<string, boolean> {
  return {
    SHOPIFY_STORE_DOMAIN: storeHost(readEnv('SHOPIFY_STORE_DOMAIN')) !== null,
    SHOPIFY_STOREFRONT_TOKEN: Boolean(
      readEnv('SHOPIFY_STOREFRONT_PRIVATE_TOKEN') ?? readEnv('SHOPIFY_STOREFRONT_ACCESS_TOKEN'),
    ),
  }
}

async function storefront<T>(
  config: ShopifyConfig,
  query: string,
  variables: Record<string, unknown>,
  buyerIp?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.isPrivate) {
    headers['Shopify-Storefront-Private-Token'] = config.token
    if (buyerIp) headers['Shopify-Storefront-Buyer-IP'] = buyerIp
  } else {
    headers['X-Shopify-Storefront-Access-Token'] = config.token
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const body = (await response.json().catch(() => null)) as {
    data?: T
    errors?: { message?: string }[] | string
  } | null

  const errors = body?.errors
  if (!response.ok || !body?.data || (errors && errors.length > 0)) {
    const detail =
      typeof errors === 'string' ? errors : errors?.map((error) => error.message).join('; ')
    throw new Error(`Shopify Storefront API ${response.status}${detail ? `: ${detail}` : ''}`)
  }

  return body.data
}

/**
 * The Shopify product handle for a SKU. A full product URL pasted in place of
 * a handle is accepted too, since that is what the Shopify admin shows.
 */
function handleFor(item: Purchasable): string {
  const raw = readItemEnv('SHOPIFY_HANDLE', item.sku) ?? item.shopifyHandle ?? item.sku
  const fromUrl = raw.match(/\/products\/([^/?#]+)/)?.[1]
  return (fromUrl ?? raw).trim().toLowerCase()
}

/**
 * The SKUs Shopify can sell right now: the product exists under its handle and
 * has at least one variant in stock. Fetched in a single request for the whole
 * list. A Shopify outage empties the set rather than failing the page — the
 * store just stops offering Shopify until it answers again.
 */
export async function shopifySellable(skus: string[]): Promise<Set<string>> {
  const config = shopifyConfig()
  const items = skus.map((sku) => findPurchasable(sku)).filter((item) => item !== undefined)
  if (!config || items.length === 0) return new Set()

  const params = items.map((_, i) => `$h${i}: String!`).join(', ')
  const fields = items
    .map((_, i) => `p${i}: product(handle: $h${i}) { availableForSale }`)
    .join('\n')
  const variables = Object.fromEntries(items.map((item, i) => [`h${i}`, handleFor(item)]))

  try {
    const data = await storefront<Record<string, { availableForSale: boolean } | null>>(
      config,
      `query StoreAvailability(${params}) {\n${fields}\n}`,
      variables,
    )
    return new Set(items.filter((_, i) => data[`p${i}`]?.availableForSale).map((item) => item.sku))
  } catch (error) {
    console.error('Could not read product availability from Shopify', error)
    return new Set()
  }
}

type Variant = {
  id: string
  availableForSale: boolean
  selectedOptions: { name: string; value: string }[]
}

const VARIANTS_QUERY = `query ProductVariants($handle: String!) {
  product(handle: $handle) {
    variants(first: 100) {
      nodes { id availableForSale selectedOptions { name value } }
    }
  }
}`

const CART_CREATE_MUTATION = `mutation CreateCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart { checkoutUrl }
    userErrors { field message }
  }
}`

/**
 * The variant a buyer means. With a size, it is the variant with an option of
 * that value (in whatever option — "Size", "Waist" — the product uses); without
 * one, the first variant in stock.
 */
function pickVariant(variants: Variant[], size: string | undefined): Variant | undefined {
  if (!size) return variants.find((variant) => variant.availableForSale) ?? variants[0]

  const wanted = size.trim().toLowerCase()
  return variants.find((variant) =>
    variant.selectedOptions.some((option) => option.value.trim().toLowerCase() === wanted),
  )
}

export type ShopifyCheckout =
  | { status: 'ready'; url: string }
  /** No Shopify product under this item's handle, or no variant for the size. */
  | { status: 'not-found' }
  | { status: 'sold-out' }
  | { status: 'not-configured' }

/**
 * Creates a Shopify cart holding one of this item and returns its checkout
 * URL. Throws when Shopify itself fails, so the caller can tell a missing
 * product apart from an outage.
 */
export async function startShopifyCheckout(
  item: Purchasable,
  size: string | undefined,
  buyerIp: string | null,
): Promise<ShopifyCheckout> {
  const config = shopifyConfig()
  if (!config) return { status: 'not-configured' }

  const { product } = await storefront<{ product: { variants: { nodes: Variant[] } } | null }>(
    config,
    VARIANTS_QUERY,
    { handle: handleFor(item) },
    buyerIp,
  )

  const variant = product ? pickVariant(product.variants.nodes, size) : undefined
  if (!variant) return { status: 'not-found' }
  if (!variant.availableForSale) return { status: 'sold-out' }

  const { cartCreate } = await storefront<{
    cartCreate: {
      cart: { checkoutUrl: string } | null
      userErrors: { field?: string[]; message: string }[]
    }
  }>(
    config,
    CART_CREATE_MUTATION,
    {
      input: {
        lines: [{ merchandiseId: variant.id, quantity: 1 }],
        // Shows on the order in the Shopify admin, so it is clear where it came from.
        attributes: [{ key: 'Ordered from', value: 'londonkoi.org' }],
      },
    },
    buyerIp,
  )

  if (!cartCreate.cart?.checkoutUrl) {
    const detail = cartCreate.userErrors.map((error) => error.message).join('; ')
    throw new Error(`Shopify did not return a checkout URL${detail ? `: ${detail}` : ''}`)
  }

  return { status: 'ready', url: cartCreate.cart.checkoutUrl }
}

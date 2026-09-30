/**
 * PayPal orders as recorded in the site database — the one place this site
 * keeps order state, because PayPal (unlike Shopify and Bandcamp) delivers
 * nothing itself.
 *
 * Server-only. Never import it from a component.
 */

import { eq, sql } from 'drizzle-orm'

import { db } from '../../db/index'
import { paypalOrders, type PaypalOrder } from '../../db/schema'
import type { Purchasable } from '../data/catalog'
import { capturePaypalOrder, inspectPaypalOrder, paidToPayee, type CapturedPayment, type NewPaypalOrder } from './paypal'

/** How many times one purchase can be downloaded, so a link can't be passed around forever. */
export const MAX_DOWNLOADS = 10

export function newAccessToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export async function recordCreatedOrder(
  item: Purchasable,
  size: string | undefined,
  order: NewPaypalOrder,
  accessToken: string,
): Promise<void> {
  await db.insert(paypalOrders).values({
    paypalOrderId: order.paypalOrderId,
    accessToken,
    kind: item.kind,
    sku: item.sku,
    title: item.title,
    size: size ?? null,
    itemCents: order.itemCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
  })
}

export async function findByPaypalId(paypalOrderId: string): Promise<PaypalOrder | undefined> {
  const [row] = await db
    .select()
    .from(paypalOrders)
    .where(eq(paypalOrders.paypalOrderId, paypalOrderId))
  return row
}

export async function findByAccessToken(accessToken: string): Promise<PaypalOrder | undefined> {
  const [row] = await db
    .select()
    .from(paypalOrders)
    .where(eq(paypalOrders.accessToken, accessToken))
  return row
}

/**
 * Saves the outcome of a capture. The order only becomes `completed` when the
 * captured amount matches what was recorded; anything else is kept for review
 * as `pending` (PayPal still clearing it) or `mismatch`.
 */
export async function recordCapture(
  order: PaypalOrder,
  payment: CapturedPayment,
): Promise<PaypalOrder['status']> {
  const amountMatches =
    payment.amountCents === order.totalCents &&
    payment.currency === order.currency &&
    paidToPayee(payment)
  const status = !payment.paid
    ? payment.captureStatus === 'PENDING'
      ? 'pending'
      : 'failed'
    : amountMatches
      ? 'completed'
      : 'mismatch'

  await db
    .update(paypalOrders)
    .set({
      status,
      captureId: payment.captureId,
      buyerName: payment.buyerName,
      buyerEmail: payment.buyerEmail,
      shippingAddress: payment.shippingAddress,
      completedAt: status === 'completed' ? new Date() : null,
    })
    .where(sql`${paypalOrders.id} = ${order.id} and ${paypalOrders.status} <> 'completed'`)

  return status
}

/** Counts one download, returning false once the order has used them all. */
export async function claimDownload(order: PaypalOrder): Promise<boolean> {
  const updated = await db
    .update(paypalOrders)
    .set({ downloadCount: sql`${paypalOrders.downloadCount} + 1` })
    .where(
      sql`${paypalOrders.id} = ${order.id} and ${paypalOrders.downloadCount} < ${MAX_DOWNLOADS}`,
    )
    .returning({ id: paypalOrders.id })
  return updated.length > 0
}

/** Recover interrupted confirmations and recheck clearing payments on the receipt page. */
export async function reconcileOrder(order: PaypalOrder): Promise<PaypalOrder> {
  if (!['created', 'pending'].includes(order.status)) return order
  try {
    const current = await inspectPaypalOrder(order.paypalOrderId)
    const payment = current.status === 'APPROVED' && order.status === 'created'
      ? await capturePaypalOrder(order.paypalOrderId)
      : current.payment
    if (payment.captureId) await recordCapture(order, payment)
    return await findByPaypalId(order.paypalOrderId) ?? order
  } catch (error) {
    console.error('Could not reconcile PayPal payment', { paypalOrderId: order.paypalOrderId }, error)
    return order
  }
}

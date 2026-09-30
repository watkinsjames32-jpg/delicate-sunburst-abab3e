/**
 * Server function behind the buyer's order page. Returns only what the buyer
 * needs to see — never the PayPal IDs or the full address — keyed by the
 * order's unguessable access token.
 */

import { createServerFn } from '@tanstack/react-start'

import { findByAccessToken, reconcileOrder, MAX_DOWNLOADS } from './orders'

export type OrderSummary = {
  status: 'created' | 'completed' | 'pending' | 'failed' | 'mismatch'
  kind: 'music' | 'merch'
  title: string
  size: string | null
  totalCents: number
  buyerName: string | null
  downloadsLeft: number
}

export const getOrderSummary = createServerFn({ method: 'GET' })
  .inputValidator((token: string) => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Bad token')
    return token
  })
  .handler(async ({ data: token }): Promise<OrderSummary | null> => {
    let order = await findByAccessToken(token)
    if (!order) return null
    order = await reconcileOrder(order)

    return {
      status: order.status as OrderSummary['status'],
      kind: order.kind as OrderSummary['kind'],
      title: order.title,
      size: order.size,
      totalCents: order.totalCents,
      buyerName: order.buyerName,
      downloadsLeft: Math.max(0, MAX_DOWNLOADS - order.downloadCount),
    }
  })

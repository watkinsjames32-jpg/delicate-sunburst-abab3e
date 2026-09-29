/**
 * Which storefronts — if any — can take money for each item, worked out once
 * so the store page and `/api/checkout` agree about it.
 *
 * - **Shopify**, when the store is connected and a product with the item's
 *   handle is in stock. The buyer picks a size here and goes straight to
 *   Shopify's checkout.
 * - **Bandcamp**, always: the item's own Bandcamp link when it has one,
 *   otherwise the artist's Bandcamp page. The buyer finishes on Bandcamp.
 * - **PayPal**, when PayPal accepts the app's credentials — for merch always, and for a
 *   single once its master is in the `music-downloads` store, since this site
 *   has to deliver the download itself.
 *
 * Server-only: reads the environment. Never import it from a component — the
 * page reaches it through the server function in `storefront.functions.ts`.
 */

import { merch, products } from '../data/catalog'
import { bandcampUrlFor } from './bandcamp'
import { skusWithMasters } from './downloads'
import { paypalReady } from './paypal'
import { shopifySellable } from './shopify'

export type ItemAvailability = {
  /** The item's Bandcamp page, when it is sold there. Public, so fine to send. */
  bandcamp: string | null
  /** True when "Buy on Shopify" would reach a checkout. */
  shopify: boolean
  /** True when "Pay with PayPal" would reach a checkout. */
  paypal: boolean
}

export type StoreAvailability = {
  /** Per SKU. The Shopify token and store settings never leave the server. */
  items: Record<string, ItemAvailability>
}

export async function storeAvailability(): Promise<StoreAvailability> {
  const skus = [...products, ...merch].map((item) => item.sku)
  const [onShopify, onPaypal] = await Promise.all([shopifySellable(skus), paypalSellable()])

  const items: Record<string, ItemAvailability> = {}
  for (const sku of skus) {
    items[sku] = {
      bandcamp: bandcampUrlFor(sku),
      shopify: onShopify.has(sku),
      paypal: onPaypal.has(sku),
    }
  }

  return { items }
}

/**
 * SKUs PayPal can sell: every merch item, plus the singles with a master to
 * deliver. If the masters can't be listed, singles are left off rather than
 * sold without a file.
 */
async function paypalSellable(): Promise<Set<string>> {
  if (!(await paypalReady())) return new Set()

  const sellable = new Set(merch.map((item) => item.sku))
  try {
    for (const sku of await skusWithMasters(products.map((product) => product.sku))) {
      sellable.add(sku)
    }
  } catch (error) {
    console.error('Could not list download masters', error)
  }
  return sellable
}

/**
 * The outbound storefronts only — Bandcamp and Shopify — for the store page's
 * buttons. PayPal is left out: its button is always shown and reports its own
 * problems at checkout, so the page doesn't wait on PayPal and Blobs to render.
 */
export async function outboundStorefronts(): Promise<StoreAvailability> {
  const skus = [...products, ...merch].map((item) => item.sku)
  const onShopify = await shopifySellable(skus)

  const items: Record<string, ItemAvailability> = {}
  for (const sku of skus) {
    items[sku] = {
      bandcamp: bandcampUrlFor(sku),
      shopify: onShopify.has(sku),
      paypal: true,
    }
  }

  return { items }
}

/** Bandcamp links only, per SKU — all the store page's buy buttons need. */
export function bandcampLinks(): Record<string, string | null> {
  const links: Record<string, string | null> = {}
  for (const item of [...products, ...merch]) links[item.sku] = bandcampUrlFor(item.sku)
  return links
}

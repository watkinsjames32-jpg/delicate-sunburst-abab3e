import { merch, products } from '../data/catalog'
import { readEnv } from './env'

/** A distinct, merchant-created hosted checkout page for each item. */
export function hostedCheckoutLinks(): Record<string, string> {
  const links: Record<string, string> = {}
  for (const item of [...products, ...merch]) {
    const raw = readEnv(`CHECKOUT_URL_${item.sku}`)
    if (!raw) continue
    try {
      const url = new URL(raw)
      if (url.protocol !== 'https:' || url.username || url.password) continue
      // Do not turn arbitrary environment values into outgoing purchase links.
      if (!['paypal.com', 'www.paypal.com', 'paypal.me', 'www.paypal.me',
        'bandcamp.com', 'www.bandcamp.com', 'londonkoi.bandcamp.com'].includes(url.hostname)) continue
      links[item.sku] = url.toString()
    } catch {
      // An incomplete link leaves the product unavailable.
    }
  }
  return links
}

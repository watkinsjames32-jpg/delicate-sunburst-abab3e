/**
 * Bandcamp links — one of the store's two ways to take a payment.
 *
 * Bandcamp has no checkout API, so a Bandcamp sale is a plain link out to the
 * item's page there. Bandcamp then takes the payment, delivers the download (or
 * ships the merch) and emails the receipt, with nothing to verify on this side.
 *
 * Where a link comes from, first match wins:
 *
 *   1. A per-item variable in the environment, named after the SKU or the
 *      item's title with `BANDCAMP_URL_` in front or `BANDCAMP_` … `_URL`
 *      around it. For Ride The Wave, any of
 *      `BANDCAMP_URL_RIDE_THE_WAVE`, `BANDCAMP_RIDE_THE_WAVE_URL` or (for
 *      FaceTime, whose SKU is `facetime-single`) `BANDCAMP_FACETIME_URL` works.
 *   2. `bandcampUrl` on the item in `catalog.ts`
 *   3. `BANDCAMP_URL`, the artist's Bandcamp page, or `ARTIST_BANDCAMP_URL`
 *      when that is unset. Releases link to the page itself and merch to its
 *      `/merch` section, so every item always has somewhere to be bought — at
 *      the cost of the buyer finding the item there.
 *
 * Server-only: it reads `process.env`. Never import it from a component.
 */

import { findPurchasable } from '../data/catalog'
import { readEnv } from './env'

/** London's own Bandcamp page, used when `BANDCAMP_URL` is not set. */
const ARTIST_BANDCAMP_URL = 'https://londonkoi.bandcamp.com'

/**
 * A usable link is an absolute `https` URL. Anything else — a placeholder, a
 * half-pasted value — is treated as missing, so the card never links somewhere
 * broken. Any host is accepted, since Bandcamp Pro artists can use their own domain.
 */
function asHttpsUrl(value: string | null | undefined): URL | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return null
    return isPlaceholderHost(url.hostname) ? null : url
  } catch {
    return null
  }
}

/**
 * Template values like `https://bandcamp.FaceTime.URL` parse as URLs but point
 * nowhere. Hosts without a dot, or ending in a reserved or template suffix, are
 * treated as unfilled placeholders.
 */
const PLACEHOLDER_SUFFIXES = ['url', 'example', 'invalid', 'test', 'localhost']

function isPlaceholderHost(hostname: string): boolean {
  const labels = hostname.toLowerCase().split('.')
  if (labels.length < 2) return true
  return PLACEHOLDER_SUFFIXES.includes(labels[labels.length - 1])
}

/**
 * The per-item variable names checked for an item, in order: SKU before title,
 * and `BANDCAMP_URL_<name>` before `BANDCAMP_<name>_URL`. The title form lets a
 * variable be named after what the item is called rather than its SKU.
 */
function itemVariableNames(sku: string, title: string): string[] {
  return [sku, title].flatMap((name) => [`BANDCAMP_URL_${name}`, `BANDCAMP_${name}_URL`])
}

/** The first per-item variable holding a usable link, skipping placeholders. */
function itemEnvUrl(sku: string, title: string): URL | null {
  for (const name of itemVariableNames(sku, title)) {
    const url = asHttpsUrl(readEnv(name))
    if (url) return url
  }
  return null
}

/** Where to send a buyer to buy this SKU on Bandcamp, or null for an unknown SKU. */
export function bandcampUrlFor(sku: string): string | null {
  const item = findPurchasable(sku)
  if (!item) return null

  const own = itemEnvUrl(item.sku, item.title) ?? asHttpsUrl(item.bandcampUrl)
  if (own) return own.toString()

  const artist = asHttpsUrl(readEnv('BANDCAMP_URL')) ?? new URL(ARTIST_BANDCAMP_URL)
  if (item.kind === 'merch') artist.pathname = '/merch'
  return artist.toString()
}

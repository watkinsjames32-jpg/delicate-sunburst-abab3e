/**
 * Bandcamp purchase links stay closed until the artist publishes listings and
 * their exact destinations are verified. Existing configured URLs include
 * misspelled hosts and unpublished tracks, so they must not reach buyers.
 */
import { findPurchasable } from '../data/catalog'

export function bandcampUrlFor(sku: string): string | null {
  if (!findPurchasable(sku)) return null
  return null
}

/**
 * Bandcamp purchase links. Each single links to its own track page, set as
 * `bandcampUrl` in `catalog.ts`. The per-item environment variables are not
 * read: the saved values include misspelled hosts, so they must not reach
 * buyers. Merch stays closed until its listings are published and verified.
 */
import { findProduct } from '../data/catalog'

export function bandcampUrlFor(sku: string): string | null {
  return findProduct(sku)?.bandcampUrl ?? null
}

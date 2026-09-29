/**
 * Server function wrapper around `storefront.ts`, so the store page can render
 * against what checkout can really do.
 *
 * The availability check reads the environment and calls Shopify with the
 * store's access token, which the browser must never do. A server function
 * keeps that on the server for both entry points: during SSR it runs
 * in-process, and on a client-side navigation to `/music` it is fetched over
 * HTTP — so a Bandcamp link or Shopify setting added in the Netlify UI, or a
 * product restocked in Shopify, takes effect on the next request either way.
 */

import { createServerFn } from '@tanstack/react-start'

import {
  bandcampLinks,
  outboundStorefronts,
  storeAvailability,
  type StoreAvailability,
} from './storefront'

export const getStoreAvailability = createServerFn().handler(
  async (): Promise<StoreAvailability> => storeAvailability(),
)

/** Bandcamp links and Shopify availability for the store page's buy buttons. */
export const getOutboundStorefronts = createServerFn().handler(
  async (): Promise<StoreAvailability> => outboundStorefronts(),
)

/** Each item's Bandcamp link, for the store page's buy buttons. */
export const getBandcampLinks = createServerFn().handler(
  async (): Promise<Record<string, string | null>> => bandcampLinks(),
)

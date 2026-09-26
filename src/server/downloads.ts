/**
 * The masters sold as downloads through PayPal, kept in the `music-downloads`
 * Netlify Blobs store as `<sku>.mp3`. They are never public: the only way out
 * is `/api/download/<token>`, for a completed PayPal order.
 *
 * Server-only. Never import it from a component.
 */

import { getStore } from '@netlify/blobs'

const store = () => getStore('music-downloads')

function masterKey(sku: string): string {
  return `${sku}.mp3`
}

/** The SKUs among `skus` that have a master uploaded, so PayPal can deliver them. */
export async function skusWithMasters(skus: string[]): Promise<Set<string>> {
  const { blobs } = await store().list()
  const keys = new Set(blobs.map((blob) => blob.key))
  return new Set(skus.filter((sku) => keys.has(masterKey(sku))))
}

export async function masterStream(sku: string): Promise<ReadableStream | null> {
  return store().get(masterKey(sku), { type: 'stream' })
}

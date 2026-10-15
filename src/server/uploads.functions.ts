/**
 * Server function the home page loads its Latest uploads section through.
 * Only finished uploads are returned, and a database hiccup just hides the
 * section rather than breaking the page.
 */

import { createServerFn } from '@tanstack/react-start'

import { publishedUploads, type PublicUpload } from './uploads'

export const getLatestUploads = createServerFn({ method: 'GET' }).handler(async (): Promise<PublicUpload[]> => {
  try {
    return await publishedUploads()
  } catch (error) {
    console.error('Could not load uploads', error)
    return []
  }
})

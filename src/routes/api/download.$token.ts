import { createFileRoute } from '@tanstack/react-router'

import { findProduct } from '../../data/catalog'
import { masterStream } from '../../server/downloads'
import { claimDownload, findByAccessToken } from '../../server/orders'

/**
 * GET → the full-length master for a completed PayPal purchase of a single.
 * The token comes from the buyer's order page; each purchase allows a limited
 * number of downloads.
 */
export const Route = createFileRoute('/api/download/$token')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[a-f0-9]{64}$/.test(params.token)) return new Response('Download not found.', { status: 404 })
        const order = await findByAccessToken(params.token)
        if (!order || order.kind !== 'music' || order.status !== 'completed') {
          return new Response('Download not found.', { status: 404 })
        }

        const stream = await masterStream(order.sku)
        if (!stream) {
          return new Response('Download temporarily unavailable. Please try again later.', { status: 503 })
        }
        if (!(await claimDownload(order))) {
          await stream.cancel()
          return new Response('This download link has been used the maximum number of times. Please get in touch if you need another copy.', { status: 410 })
        }

        const title = findProduct(order.sku)?.title ?? order.title
        const filename = `London Koi - ${title}.mp3`.replace(/[^\w .()-]/g, '')
        return new Response(stream, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'private, no-store',
          },
        })
      },
    },
  },
})

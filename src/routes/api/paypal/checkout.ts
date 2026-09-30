import { createFileRoute } from '@tanstack/react-router'

import { findPurchasable } from '../../../data/catalog'
import { skusWithMasters } from '../../../server/downloads'
import { newAccessToken, recordCreatedOrder } from '../../../server/orders'
import {
  PaypalError,
  createPaypalOrder,
  describePaypalSetup,
  paypalConfigured,
} from '../../../server/paypal'

/**
 * POST → creates a PayPal order for one item at the catalog price, records it,
 * and returns PayPal's approval URL for the browser to go to.
 */
export const Route = createFileRoute('/api/paypal/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let sku: unknown
        let size: unknown
        let colour: unknown
        try {
          const body = (await request.json()) as { sku?: unknown; size?: unknown; colour?: unknown }
          sku = body.sku
          size = body.size
          colour = body.colour
        } catch {
          return Response.json({ error: 'Invalid request body.' }, { status: 400 })
        }

        if (typeof sku !== 'string') {
          return Response.json({ error: 'Missing product.' }, { status: 400 })
        }

        const product = findPurchasable(sku)
        if (!product) {
          return Response.json({ error: 'That item is not available.' }, { status: 404 })
        }

        if (product.sizes && (typeof size !== 'string' || !product.sizes.includes(size))) {
          return Response.json({ error: 'Please choose a size first.' }, { status: 400 })
        }

        if (product.colours && (typeof colour !== 'string' || !product.colours.includes(colour))) {
          return Response.json({ error: 'Please choose a colour first.' }, { status: 400 })
        }

        if (!paypalConfigured()) {
          console.warn('PayPal checkout is not configured', describePaypalSetup())
          return Response.json({ error: 'PayPal checkout is not connected yet.' }, { status: 503 })
        }

        // The colour rides along with the size, e.g. "M, Black", so the order
        // record and PayPal's receipt both name the exact variant to pack.
        const chosenSize =
          [product.sizes && size, product.colours && colour]
            .filter((part): part is string => typeof part === 'string')
            .join(', ') || undefined

        try {
          if (product.kind === 'music' && !(await skusWithMasters([product.sku])).has(product.sku)) {
            console.warn('No download master for PayPal sale', { sku })
            return Response.json(
              { error: 'This download is not available through PayPal yet.' },
              { status: 422 },
            )
          }

          const accessToken = newAccessToken()
          const order = await createPaypalOrder(product, chosenSize, {
            origin: new URL(request.url).origin,
            requestId: accessToken,
          })
          await recordCreatedOrder(product, chosenSize, order, accessToken)

          return Response.json({ url: order.approveUrl })
        } catch (error) {
          console.error('PayPal checkout failed', error)
          if (error instanceof PaypalError && error.issue === 'INVALID_CREDENTIALS') {
            return Response.json(
              { error: 'PayPal checkout is temporarily unavailable. Please try again later.' },
              { status: 503 },
            )
          }
          return Response.json(
            { error: 'Could not start PayPal checkout. Please try again.' },
            { status: 502 },
          )
        }
      },
    },
  },
})

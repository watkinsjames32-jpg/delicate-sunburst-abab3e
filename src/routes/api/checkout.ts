import { createFileRoute } from '@tanstack/react-router'

import { findPurchasable } from '../../data/catalog'
import { describeShopifySetup, startShopifyCheckout } from '../../server/shopify'

/**
 * POST → starts a Shopify checkout for one item. Bandcamp needs no endpoint:
 * its "Buy" button is a plain link to the item's Bandcamp page.
 */
export const Route = createFileRoute('/api/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let sku: unknown
        let size: unknown
        try {
          const body = (await request.json()) as { sku?: unknown; size?: unknown }
          sku = body.sku
          size = body.size
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

        const chosenSize = product.sizes && typeof size === 'string' ? size : undefined
        // Netlify's own header, for Shopify's bot protection on private tokens.
        const buyerIp = request.headers.get('x-nf-client-connection-ip')

        try {
          const checkout = await startShopifyCheckout(product, chosenSize, buyerIp)

          switch (checkout.status) {
            case 'ready':
              return Response.json({ url: checkout.url })
            case 'sold-out':
              return Response.json(
                {
                  error: chosenSize
                    ? `Size ${chosenSize} is sold out on Shopify right now.`
                    : 'This item is sold out on Shopify right now.',
                },
                { status: 409 },
              )
            case 'not-found':
              console.warn('No matching Shopify product or variant', { sku, size: chosenSize })
              return Response.json(
                {
                  error: chosenSize
                    ? `Size ${chosenSize} isn't available on Shopify.`
                    : 'This item is not on Shopify yet.',
                },
                { status: 422 },
              )
            case 'not-configured':
              console.warn('Shopify checkout is not configured', describeShopifySetup())
              return Response.json(
                { error: 'Shopify checkout is not connected yet.' },
                { status: 503 },
              )
          }
        } catch (error) {
          console.error('Shopify checkout failed', error)
          return Response.json(
            { error: 'Could not start checkout. Please try again.' },
            { status: 502 },
          )
        }
      },
    },
  },
})

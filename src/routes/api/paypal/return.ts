import { createFileRoute } from '@tanstack/react-router'

import { findByPaypalId, recordCapture } from '../../../server/orders'
import { capturePaypalOrder, payeeEmail } from '../../../server/paypal'

function redirect(to: string, request: Request): Response {
  return Response.redirect(new URL(to, request.url), 303)
}

/**
 * GET ← PayPal sends the buyer here after they approve, with the order ID as
 * `token`. Captures the payment and forwards them to their order page. Safe to
 * reload: an order already completed is not captured twice.
 */
export const Route = createFileRoute('/api/paypal/return')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const paypalOrderId = new URL(request.url).searchParams.get('token')
        if (!paypalOrderId || !/^[A-Z0-9]{10,40}$/.test(paypalOrderId)) return redirect('/music', request)

        const order = await findByPaypalId(paypalOrderId)
        if (!order) {
          console.warn('PayPal return for an unknown order', { paypalOrderId })
          return redirect('/music', request)
        }

        const orderPage = `/order/${order.accessToken}`
        if (!['created', 'pending'].includes(order.status)) return redirect(orderPage, request)

        try {
          const payment = await capturePaypalOrder(paypalOrderId)
          const status = await recordCapture(order, payment)
          if (status === 'mismatch') {
            console.error('PayPal capture does not match the order', {
              paypalOrderId,
              expectedCents: order.totalCents,
              capturedCents: payment.amountCents,
              currency: payment.currency,
              expectedPayee: payeeEmail(),
              capturedPayee: payment.payeeEmail,
            })
          }
        } catch (error) {
          console.error('PayPal capture failed', { paypalOrderId }, error)
        }

        return redirect(orderPage, request)
      },
    },
  },
})

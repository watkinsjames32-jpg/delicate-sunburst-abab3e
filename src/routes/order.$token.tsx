import { createFileRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Footer, Nav } from '../components/site'
import { formatPrice } from '../data/catalog'
import { getOrderSummary, type OrderSummary } from '../server/orders.functions'

export const Route = createFileRoute('/order/$token')({
  loader: async ({ params }) => {
    try {
      return { order: await getOrderSummary({ data: params.token }) }
    } catch {
      return { order: null }
    }
  },
  head: () => ({
    meta: [{ title: 'Your order | London Koi' }, { name: 'robots', content: 'noindex' }],
  }),
  component: OrderPage,
})

const PRIMARY_BUTTON =
  'inline-block rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 transition-colors shadow-sm px-7 py-3'

function firstName(order: OrderSummary): string {
  return order.buyerName?.split(' ')[0] ?? ''
}

function Delivered({ order, token }: { order: OrderSummary; token: string }) {
  if (order.kind === 'merch') {
    return (
      <>
        <p className="text-slate-700 leading-relaxed mb-4">
          Your Koi Ware order is in. It&rsquo;s packed by hand in Birmingham and most orders
          ship in 5&ndash;10 business days, to the address you gave PayPal.
        </p>
        <p className="text-sm text-slate-500">
          PayPal has emailed your receipt. Keep it handy in case you need to get in touch
          about the order.
        </p>
      </>
    )
  }

  return (
    <>
      <p className="text-slate-700 leading-relaxed mb-6">
        &ldquo;{order.title}&rdquo; is yours to keep. Download the MP3 below and play it on any
        phone, laptop or car stereo.
      </p>
      {order.downloadsLeft > 0 ? (
        <>
          <a href={`/api/download/${token}`} className={PRIMARY_BUTTON}>
            Download &ldquo;{order.title}&rdquo;
          </a>
          <p className="text-sm text-slate-500 mt-4">
            Bookmark this page — it&rsquo;s your link back to the download.{' '}
            {order.downloadsLeft} download{order.downloadsLeft === 1 ? '' : 's'} left.
          </p>
        </>
      ) : (
        <p className="text-slate-700">
          This purchase has been downloaded the maximum number of times. Please get in touch
          if you need another copy.
        </p>
      )}
    </>
  )
}

function OrderPage() {
  const { order } = Route.useLoaderData()
  const { token } = Route.useParams()

  let heading: string
  let body: ReactNode

  if (!order) {
    heading = 'Order not found'
    body = (
      <p className="text-slate-700">
        We couldn&rsquo;t find that order. Check the link, or head back to the store.
      </p>
    )
  } else if (order.status === 'completed') {
    heading = `Thank you${firstName(order) ? `, ${firstName(order)}` : ''}!`
    body = <Delivered order={order} token={token} />
  } else if (order.status === 'pending') {
    heading = 'Payment processing'
    body = (
      <p className="text-slate-700 leading-relaxed">
        PayPal is still clearing your payment. Once it goes through, come back to this page
        {order.kind === 'music' ? ' for your download' : ' — your order will ship once it clears'}.
      </p>
    )
  } else if (order.status === 'created') {
    heading = 'Payment not finished'
    body = (
      <p className="text-slate-700 leading-relaxed">
        This PayPal payment wasn&rsquo;t completed, so you haven&rsquo;t been charged. You can
        try again from the store.
      </p>
    )
  } else {
    heading = 'Something went wrong'
    body = (
      <p className="text-slate-700 leading-relaxed">
        We couldn&rsquo;t confirm this payment. If PayPal shows you were charged, please get in
        touch with your PayPal receipt and we&rsquo;ll sort it out.
      </p>
    )
  }

  return (
    <main className="bg-sky-50 min-h-screen">
      <Nav />
      <section className="bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50 pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto rounded-3xl bg-white border border-sky-200 shadow-sm p-8 sm:p-10">
          <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-4">
            Your order
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6">{heading}</h1>
          {order && (
            <p className="text-sm text-slate-500 mb-6">
              {order.title}
              {order.size ? ` · Size ${order.size}` : ''} · {formatPrice(order.totalCents)}
            </p>
          )}
          {body}
          <div className="mt-10">
            <Link to="/music" className="text-sm font-semibold text-sky-700 hover:text-slate-900">
              &larr; Back to the store
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}

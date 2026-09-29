import { createFileRoute } from '@tanstack/react-router'
import { FishSymbol } from 'lucide-react'
import { useState } from 'react'
import { getHostedCheckoutLinks } from '../server/hosted-checkout.functions'

import { Footer, Nav, PreviewPlayer, img } from '../components/site'
import { siteUrl } from './__root'
import {
  formatPrice,
  merch,
  merchCategories,
  products,
  upcoming,
  type MerchCategory,
  type MerchItem,
  type Product,
  type UpcomingRelease,
} from '../data/catalog'

export const Route = createFileRoute('/music')({
  loader: () => getHostedCheckoutLinks(),
  head: () => ({
    meta: [
      { title: 'Shop Music & Merchandise | London Koi' },
      {
        name: 'description',
        content:
          'Buy London Koi’s singles and Koi Ware merchandise directly from the artist — digital downloads you own, plus tees, hoodies, caps, sweats and denim.',
      },
      {
        property: 'og:title',
        content: 'Shop Music & Merchandise | London Koi',
      },
      {
        property: 'og:description',
        content:
          'Buy London Koi’s singles and Koi Ware merchandise directly from the artist — digital downloads you own, plus tees, hoodies, caps, sweats and denim.',
      },
      {
        property: 'og:url',
        content: `${siteUrl}/music`,
      },
    ],
    links: [{ rel: 'canonical', href: `${siteUrl}/music` }],
  }),
  component: MusicStore,
})

const CHECKOUT_BUTTON =
  'inline-block rounded-full bg-[#0070ba] text-white font-semibold hover:bg-[#005ea6] transition-colors shadow-sm'

/**
 * Each item links to its own merchant-created hosted payment page.
 */
function BuyOptions({
  sku,
  url,
  variant = 'lg',
  needsSize = false,
}: {
  sku: string
  url?: string
  variant?: 'lg' | 'sm'
  needsSize?: boolean
}) {
  const sizing = variant === 'lg' ? 'px-7 py-3' : 'px-5 py-2 text-sm'

  if (!url) return <p className="text-sm text-slate-600">Coming soon — checkout is being set up.</p>

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={url}
          className={`${CHECKOUT_BUTTON} ${sizing}`}
          aria-label={`Buy ${sku} on secure checkout`}
        >
          Buy now
        </a>
      </div>
      {needsSize && <p className="text-xs text-slate-500 mt-2">Choose your size on the checkout page.</p>}
    </div>
  )
}

/** Cover art when a release has artwork, otherwise a titled tile. */
function Cover({ product }: { product: Product }) {
  if (product.cover) {
    return (
      <img
        src={img(product.cover, 700)}
        alt={`${product.title} cover art`}
        className="w-full h-full object-cover"
      />
    )
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-sky-300 via-sky-200 to-amber-200 flex items-center justify-center p-6">
      <span className="text-center text-2xl font-bold text-slate-900 leading-tight">
        {product.title}
      </span>
    </div>
  )
}

function FeaturedRelease({
  product,
  url,
}: {
  product: Product
  url?: string
}) {
  return (
    <article className="rounded-3xl bg-white border border-sky-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="md:w-2/5">
        <div className="aspect-square h-full">
          <Cover product={product} />
        </div>
      </div>
      <div className="md:w-3/5 p-8 sm:p-10 flex flex-col justify-center">
        <p className="uppercase tracking-widest text-sky-700 text-xs font-semibold mb-3">
          New hot single · {product.format}
        </p>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          &ldquo;{product.title}&rdquo;
        </h2>
        {product.description && (
          <p className="text-slate-600 leading-relaxed mb-6">{product.description}</p>
        )}
        <PreviewPlayer src={product.preview} title={product.title} variant="lg" />
        <p className="text-2xl font-bold text-slate-900 mb-6">
          {formatPrice(product.priceCents)}
        </p>
        <BuyOptions sku={product.sku} url={url} />
      </div>
    </article>
  )
}

function ReleaseCard({
  product,
  url,
}: {
  product: Product
  url?: string
}) {
  return (
    <article className="rounded-3xl bg-white border border-sky-200 shadow-sm overflow-hidden flex flex-col">
      <div className="aspect-square">
        <Cover product={product} />
      </div>
      <div className="p-6 flex flex-col grow">
        <h3 className="text-xl font-bold text-slate-900 mb-1">
          &ldquo;{product.title}&rdquo;
        </h3>
        <p className="text-sm text-slate-500 mb-5">{product.format}</p>
        <PreviewPlayer src={product.preview} title={product.title} />
        <div className="mt-auto">
          <p className="text-xl font-bold text-slate-900 mb-4">
            {formatPrice(product.priceCents)}
          </p>
          <BuyOptions sku={product.sku} url={url} variant="sm" />
        </div>
      </div>
    </article>
  )
}

/**
 * An announced title. Plays its teaser clip when one has been uploaded, and
 * falls back to the plain dashed tile if the file is missing or won't play, so
 * the card never renders as a broken player.
 */
function ComingSoonCard({ release }: { release: UpcomingRelease }) {
  const [clipFailed, setClipFailed] = useState(false)
  const showClip = Boolean(release.video) && !clipFailed

  return (
    <article className="rounded-3xl border border-dashed border-sky-400 bg-white/70 overflow-hidden text-center flex flex-col">
      {showClip && (
        <div className="aspect-square bg-slate-900">
          <video
            src={release.video}
            controls
            playsInline
            preload="metadata"
            onError={() => setClipFailed(true)}
            aria-label={`${release.title} teaser`}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className={showClip ? 'p-6' : 'p-8'}>
        <p className="text-xl font-bold text-slate-900">&ldquo;{release.title}&rdquo;</p>
        <p className="text-sm text-slate-500 mt-2">Coming soon</p>
      </div>
    </article>
  )
}

/** Each merch section gets its own gradient so the grid reads as a range, not a repeat. */
const MERCH_TILES: Record<MerchCategory, string> = {
  'T-Shirts': 'from-sky-300 via-sky-200 to-amber-200',
  Hoodies: 'from-slate-300 via-sky-200 to-sky-100',
  Caps: 'from-amber-200 via-amber-100 to-sky-200',
  Sweats: 'from-sky-200 via-slate-200 to-slate-300',
  Jeans: 'from-sky-400 via-sky-300 to-slate-300',
  Accessories: 'from-amber-300 via-amber-200 to-sky-200',
}

/** Product photo(s) when they exist, otherwise a koi-marked tile in the item's palette. */
function MerchTile({ item }: { item: MerchItem }) {
  const [shown, setShown] = useState(0)

  if (item.photos && item.photos.length > 0) {
    const photos = item.photos
    const current = photos[shown] ?? photos[0]
    return (
      <div className="relative w-full h-full">
        <img
          src={img(current.src, 700)}
          alt={current.alt}
          className="w-full h-full object-cover"
        />
        {photos.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
            {photos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setShown(i)}
                aria-label={`Show photo ${i + 1} of ${photos.length}`}
                aria-pressed={i === shown}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 shadow transition ${
                  i === shown ? 'border-amber-400' : 'border-white/80 opacity-80 hover:opacity-100'
                }`}
              >
                <img src={img(photo.src, 120)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (item.cover) {
    return (
      <img
        src={img(item.cover, 700)}
        alt={`${item.title} product photo`}
        className="w-full h-full object-cover"
      />
    )
  }

  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${MERCH_TILES[item.category]} relative flex items-center justify-center p-6`}
    >
      <FishSymbol
        className="absolute inset-0 m-auto w-2/3 h-2/3 text-white/40"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <span className="relative text-center text-xl font-bold text-slate-900 leading-tight">
        {item.title}
      </span>
    </div>
  )
}

function MerchCard({ item, url }: { item: MerchItem; url?: string }) {

  return (
    <article className="rounded-3xl bg-white border border-sky-200 shadow-sm overflow-hidden flex flex-col">
      <div className="aspect-square">
        <MerchTile item={item} />
      </div>
      <div className="p-6 flex flex-col grow">
        <h3 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h3>
        <p className="text-sm text-slate-500 mb-4">{item.format}</p>
        {item.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-5">{item.description}</p>
        )}
        <div className="mt-auto">
          <p className="text-sm text-slate-500 mb-4">
            {item.sizes ? `Available sizes: ${item.sizes.join(', ')}` : 'One size'}
          </p>
          <p className="text-xl font-bold text-slate-900 mb-4">{formatPrice(item.priceCents)}</p>
          <BuyOptions
            sku={item.sku}
            url={url}
            variant="sm"
            needsSize={Boolean(item.sizes)}
          />
        </div>
      </div>
    </article>
  )
}

/** The Koi Ware line, grouped into the categories that have stock. */
function KoiWare({ links }: { links: Record<string, string> }) {
  const sections = merchCategories
    .map((category) => ({ category, items: merch.filter((item) => item.category === category) }))
    .filter((section) => section.items.length > 0)

  if (sections.length === 0) return null

  return (
    <div id="koi-ware" className="mt-24 scroll-mt-24">
      <div className="max-w-3xl">
        <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-4">
          Merchandise
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Koi Ware</h2>
        <p className="text-slate-600 leading-relaxed mb-3">
          London&rsquo;s own clothing line — tees, hoodies, caps, sweats and denim, printed and
          embroidered in small runs. Wear it to a show and you&rsquo;ll be spotted from the
          stage.
        </p>
        <p className="text-sm text-slate-500">
          Shipping is worked out at checkout. Most orders ship in 5&ndash;10 business days.
        </p>
      </div>

      {sections.map(({ category, items }) => (
        <section key={category} className="mt-14">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">{category}</h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MerchCard key={item.sku} item={item} url={links[item.sku]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MusicStore() {
  const links = Route.useLoaderData()
  const [featured, ...moreSingles] = products

  return (
    <main className="bg-sky-50 min-h-screen">
      <Nav />

      <section className="bg-gradient-to-b from-sky-200 via-sky-100 to-sky-50 pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-4">
            Official Store
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-5">
            Shop Music &amp; Merchandise
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Buy London&rsquo;s singles and her Koi Ware clothing line straight from the artist.
            Downloads are yours to keep, merch ships to your door, and every order supports a
            young singer&rsquo;s studio time directly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            <a
              href="#music"
              className="px-5 py-2 rounded-full bg-white border border-sky-300 text-slate-800 hover:border-slate-400 transition-colors"
            >
              Music
            </a>
            <a
              href="#koi-ware"
              className="px-5 py-2 rounded-full bg-white border border-sky-300 text-slate-800 hover:border-slate-400 transition-colors"
            >
              Koi Ware merch
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div id="music" className="scroll-mt-24">
            <p className="uppercase tracking-[0.3em] text-sky-700 text-sm font-semibold mb-4">
              Music
            </p>
            {featured && (
              <FeaturedRelease product={featured} url={links[featured.sku]} />
            )}

            {moreSingles.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">More singles</h2>
                <p className="text-slate-600 mb-8">
                  Hit play for a 30-second taster, then buy the full-length download.
                </p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {moreSingles.map((product) => (
                    <ReleaseCard
                      key={product.sku}
                      product={product}
                      url={links[product.sku]}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Coming soon</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((release) => (
                    <ComingSoonCard key={release.title} release={release} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <KoiWare links={links} />

          <div className="mt-24 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Secure checkout</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Payments are completed on the linked provider’s secure checkout page. Card
                details never touch this site.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Yours to keep</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                For music bought on Bandcamp, your download comes from Bandcamp after purchase.
                Check the product checkout page for delivery details.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Merch ships from Alabama</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Koi Ware is packed by hand in Birmingham, with tracking sent once it&rsquo;s on
                its way.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

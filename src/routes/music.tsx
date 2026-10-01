import { createFileRoute } from '@tanstack/react-router'
import { FishSymbol } from 'lucide-react'
import { useState } from 'react'

import { Footer, Nav, PreviewPlayer, YouTubeLink, img } from '../components/site'
import { siteUrl } from './__root'
import {
  formatPrice,
  merch,
  merchCategories,
  findPurchasable,
  products,
  upcoming,
  type MerchCategory,
  type MerchItem,
  type Product,
  type Purchasable,
  type UpcomingRelease,
} from '../data/catalog'

export const Route = createFileRoute('/music')({
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

/**
 * How to buy one item: "Buy with PayPal", which starts a PayPal checkout
 * session for it. Items with sizes or colours use `MerchCard`'s pickers instead.
 */
function BuyOptions({ sku, variant = 'lg' }: { sku: string; variant?: 'lg' | 'sm' }) {
  const item = findPurchasable(sku)
  if (!item) return <span className="text-sm font-semibold text-slate-600">Checkout temporarily unavailable</span>
  if (item.paypalPaymentUrl) {
    return (
      <a
        href={item.paypalPaymentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${PAYPAL_BUTTON} inline-block ${variant === 'lg' ? 'px-7 py-3' : 'px-5 py-2 text-sm'}`}
      >
        Buy with PayPal
      </a>
    )
  }

  return <PaypalCheckout item={item} variant={variant} />
}

const PAYPAL_BUTTON =
  'rounded-full bg-[#0070ba] text-white font-semibold hover:bg-[#005ea6] transition-colors shadow-sm disabled:opacity-60'

/**
 * "Pay with PayPal" for an item this site sells itself. The buyer's size and
 * colour go to `/api/paypal/checkout`, which sends them on to PayPal; if the
 * order can't be started, the endpoint's reason is shown on the card.
 */
function PaypalCheckout({
  item,
  size,
  colour,
  variant = 'sm',
}: {
  item: Purchasable
  size?: string
  colour?: string
  variant?: 'lg' | 'sm'
}) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = async () => {
    if (item.sizes && !size) return setError('Choose a size to continue.')
    if (item.colours && !colour) return setError('Choose a colour to continue.')

    setStarting(true)
    setError(null)
    try {
      const response = await fetch('/api/paypal/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: item.sku, size, colour }),
      })
      const body = await response.json()
      if (response.ok && typeof body?.url === 'string') {
        const url = new URL(body.url)
        if (url.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname)) throw new Error('Invalid checkout URL')
        window.location.href = body.url as string
        return
      }
      setError(body?.error ?? 'Could not start checkout. Please try again.')
    } catch {
      setError('Could not reach checkout. Please check your connection and try again.')
    }
    setStarting(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={starting}
        className={`${PAYPAL_BUTTON} ${variant === 'lg' ? 'px-7 py-3' : 'px-5 py-2 text-sm'}`}
      >
        {starting ? 'Taking you to PayPal…' : 'Buy with PayPal'}
      </button>
      {error && <p role="alert" className="text-sm text-red-600 mt-3 max-w-sm">{error}</p>}
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
}: {
  product: Product
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
        <YouTubeLink href={product.youtubeUrl} title={product.title} />
        <p className="text-2xl font-bold text-slate-900 mb-6">{formatPrice(product.priceCents)}</p>
        <BuyOptions sku={product.sku} />
      </div>
    </article>
  )
}

function ReleaseCard({
  product,
}: {
  product: Product
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
        <YouTubeLink href={product.youtubeUrl} title={product.title} />
        <div className="mt-auto">
          <p className="text-xl font-bold text-slate-900 mb-4">{formatPrice(product.priceCents)}</p>
          <BuyOptions sku={product.sku} variant="sm" />
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
function MerchTile({
  item,
  shown: chosen,
  onShow,
}: {
  item: MerchItem
  /** Photo to show, when the card controls it (e.g. from the colour picker). */
  shown?: number
  onShow?: (index: number) => void
}) {
  const [own, setOwn] = useState(0)
  const shown = chosen ?? own
  const setShown = onShow ?? setOwn

  if (item.photos && item.photos.length > 0) {
    const photos = item.photos
    const current = photos[shown] ?? photos[0]
    return (
      <div className="relative w-full h-full">
        {/* Served as JPEG rather than WebP so a saved photo can be posted anywhere. */}
        <img
          src={img(current.src, 700, undefined, 'jpg')}
          alt={current.alt}
          className="w-full h-full object-cover"
        />
        <a
          href={current.src}
          download
          className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow hover:bg-white"
        >
          Save JPG
        </a>
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
                <img src={img(photo.src, 120, undefined, 'jpg')} alt="" className="w-full h-full object-cover" />
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

/** One set of choices on a PayPal card — sizes or colourways. */
function OptionPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | undefined
  onChange: (option: string) => void
}) {
  return (
    <fieldset className="mb-4">
      <legend className="text-xs uppercase tracking-widest text-sky-700 font-semibold mb-2">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={value === option}
            className={`min-w-11 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
              value === option
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-sky-300 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function MerchCard({ item }: { item: MerchItem }) {
  const [size, setSize] = useState<string | undefined>(undefined)
  const [colour, setColour] = useState<string | undefined>(undefined)
  const [photo, setPhoto] = useState(0)

  // Colourways and photos are listed in the same order, so picking a colour
  // shows it and picking a photo picks its colour.
  const pairsPhotos = item.colours && item.photos?.length === item.colours.length
  const chooseColour = (next: string) => {
    setColour(next)
    if (pairsPhotos) setPhoto(item.colours!.indexOf(next))
  }
  const choosePhoto = (index: number) => {
    setPhoto(index)
    if (pairsPhotos) setColour(item.colours![index])
  }

  return (
    <article className="rounded-3xl bg-white border border-sky-200 shadow-sm overflow-hidden flex flex-col">
      <div className="aspect-square">
        <MerchTile item={item} shown={photo} onShow={choosePhoto} />
      </div>
      <div className="p-6 flex flex-col grow">
        <h3 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h3>
        <p className="text-sm text-slate-500 mb-4">{item.format}</p>
        {item.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-5">{item.description}</p>
        )}
        <div className="mt-auto">
          {item.sizes ? (
            <OptionPicker
              label={item.category === 'Jeans' ? 'Waist' : 'Size'}
              options={item.sizes}
              value={size}
              onChange={setSize}
            />
          ) : (
            <p className="text-sm text-slate-500 mb-4">One size</p>
          )}
          {item.colours && (
            <OptionPicker label="Colour" options={item.colours} value={colour} onChange={chooseColour} />
          )}
          <p className="text-xl font-bold text-slate-900 mb-4">{formatPrice(item.priceCents)}</p>
          <PaypalCheckout item={{ ...item, kind: 'merch' }} size={size} colour={colour} />
        </div>
      </div>
    </article>
  )
}

/** The Koi Ware line, grouped into the categories that have stock. */
function KoiWare() {
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
              <MerchCard key={item.sku} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MusicStore() {
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
            Explore London&rsquo;s singles and Koi Ware. Every single and Koi Ware piece can be purchased securely with PayPal.
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
              <FeaturedRelease product={featured} />
            )}

            {moreSingles.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">More singles</h2>
                <p className="text-slate-600 mb-8">
                  Hit play for a 30-second preview. Buy with PayPal for your full download.
                </p>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {moreSingles.map((product) => (
                    <ReleaseCard
                      key={product.sku}
                      product={product}
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

          <KoiWare />

          <div className="mt-24 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Secure checkout</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Buy with PayPal takes you to PayPal to pay. Card details never touch this
                site.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Yours to keep</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your download is available after payment confirmation — play it on any phone,
                laptop, or car stereo.
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

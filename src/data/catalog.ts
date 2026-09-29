/**
 * Where an item can be bought. Both storefronts can sell every item, and each
 * is optional per item — a card offers whichever of the two are set up.
 *
 * Either field can also be supplied, or overridden, from the environment so an
 * item can be opened for sale without a code change; see `src/server/bandcamp.ts`
 * and `src/server/shopify.ts`. Shopify and Bandcamp charge their own price and
 * run their own delivery, so `priceCents` has to be kept in step with both by
 * hand. PayPal (`src/server/paypal.ts`) needs no field here: it is available to
 * every item and charges `priceCents` itself.
 */
type Storefronts = {
  /**
   * The item's own page on Bandcamp (a track, album or merch URL). Bandcamp
   * takes the payment and delivers the download or ships the item itself.
   */
  bandcampUrl?: string
  /**
   * Handle of the matching product in Shopify, i.e. the last part of its
   * `/products/<handle>` URL. Defaults to the SKU, so a Shopify product created
   * with the SKU as its handle needs no entry here at all.
   */
  shopifyHandle?: string
}

export type Product = Storefronts & {
  /** Stable identifier used at checkout and in environment variable names. */
  sku: string
  title: string
  format: string
  /** Optional long copy. Only releases with written blurbs set this. */
  description?: string
  /** Displayed price in US cents. Each storefront charges its own price. */
  priceCents: number
  /** Cover art path, when artwork exists. Cards fall back to a titled tile. */
  cover?: string
  /**
   * 30-second taster in `public/audio/`, served directly rather than through
   * the Image CDN. Unset until a clip has been cut from the master.
   */
  preview?: string
  /** The song's video on YouTube, linked from its cards as "Watch on YouTube". */
  youtubeUrl?: string
}

/**
 * Spec line shown under a release. The quality describes the release's master,
 * so it is set per release rather than shared — the masters are not all
 * encoded the same way.
 */
function singleFormat(quality: string, runtime: string) {
  return `Digital single — ${quality} MP3 · ${runtime}`
}

const SINGLE_PRICE_CENTS = 99

/*
 * No release has a `bandcampUrl` yet: the Londonkoi Bandcamp page has no
 * published tracks, so `https://londonkoi.bandcamp.com/track/<slug>` links
 * (facetime, ride-the-wave, be-great, special) are 404s. Cards show
 * "Coming soon on Bandcamp" until each track is live and its URL is set here.
 */
export const products: Product[] = [
  {
    sku: 'facetime-single',
    title: 'FaceTime',
    format: singleFormat('320kbps', '2:38'),
    description:
      "London's latest single, showing off both the big belting moments and the softer, more personal side of her voice. Yours to keep and play anywhere, with no subscription needed.",
    priceCents: SINGLE_PRICE_CENTS,
    cover: '/img/facetime-new-hot-single.jpg',
    preview: '/audio/facetime-preview.mp3',
  },
  {
    sku: 'ride-the-wave',
    title: 'Ride The Wave',
    format: singleFormat('VBR ~190kbps', '2:53'),
    priceCents: SINGLE_PRICE_CENTS,
    cover: '/img/ride-the-wave-cover.jpg',
    preview: '/audio/ride-the-wave-preview.mp3',
  },
  {
    sku: 'be-great',
    title: 'Be Great',
    format: singleFormat('VBR ~190kbps', '4:28'),
    priceCents: SINGLE_PRICE_CENTS,
    cover: '/img/be-great-cover.jpg',
    preview: '/audio/be-great-preview.mp3',
  },
  {
    sku: 'special',
    title: 'Special',
    format: singleFormat('VBR ~180kbps', '4:13'),
    priceCents: SINGLE_PRICE_CENTS,
    cover: '/img/special-cover.png',
    preview: '/audio/special-preview.mp3',
    youtubeUrl: 'https://youtu.be/tqHnRDPOP8g',
  },
]

/** Announced but not yet on sale, so deliberately has no SKU or price. */
export type UpcomingRelease = {
  title: string
  /**
   * Teaser clip for the card, served straight out of `public/` rather than the
   * Image CDN. Unset until a clip has actually been uploaded.
   */
  video?: string
}

export const upcoming: UpcomingRelease[] = [
  { title: 'Imma Old Soul', video: '/video/special.mp4' },
]

export function findProduct(sku: string): Product | undefined {
  return products.find((product) => product.sku === sku)
}

/**
 * The single the home page's New Single section leads with. The store lands on
 * the same release by taking the head of `products`.
 */
export const featuredProduct = products[0]

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/* ---------------------------------------------------------------- Koi Ware */

/** Sections the merch line is grouped under on the store page. */
export type MerchCategory = 'T-Shirts' | 'Hoodies' | 'Caps' | 'Sweats' | 'Jeans' | 'Accessories'

/**
 * A physical Koi Ware item. Ships from Birmingham rather than being downloaded,
 * and may carry sizes the buyer has to choose from.
 */
export type MerchItem = Storefronts & {
  /** Stable identifier used at checkout and in environment variable names. */
  sku: string
  title: string
  category: MerchCategory
  /** Short spec line, e.g. "Unisex heavyweight cotton tee". */
  format: string
  /** Optional long copy. Only items with written blurbs set this. */
  description?: string
  /** Displayed price in US cents. Each storefront charges its own price. */
  priceCents: number
  /** Product photo path, when one exists. Cards fall back to a titled tile. */
  cover?: string
  /**
   * Several product photos (e.g. one per colourway), shown on the card with a
   * thumbnail switcher. Takes the place of `cover` when set.
   */
  photos?: { src: string; alt: string }[]
  /**
   * Size options the buyer picks from. One-size goods leave this unset. For
   * Shopify checkout each size must match the value of one of the product's
   * variant options (e.g. a "Size" option of "XL").
   */
  sizes?: string[]
}

const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL']
const WAIST_SIZES = ['28', '30', '32', '34', '36', '38']

export const merch: MerchItem[] = [
  {
    sku: 'koi-ware-logo-tee',
    title: 'Koi Ware Logo Tee',
    category: 'T-Shirts',
    format: 'Unisex heavyweight cotton tee',
    description:
      'The everyday Koi Ware staple — a soft heavyweight cotton tee with the koi mark across the chest, cut to keep its shape wash after wash.',
    priceCents: 3500,
    photos: [
      {
        src: '/img/koi-ware-logo-tee-black.jpg',
        alt: 'Black Koi Ware Logo Tee with the London Koi script and microphone in rose gold',
      },
      {
        src: '/img/koi-ware-logo-tee-white.jpg',
        alt: 'White Koi Ware Logo Tee with the London Koi script in teal and pink with sparkles',
      },
    ],
    sizes: APPAREL_SIZES,
  },
  {
    sku: 'koi-ware-facetime-tee',
    title: 'FaceTime Tee',
    category: 'T-Shirts',
    format: 'Unisex cotton tee, front print',
    description:
      'The FaceTime logo in hot pink and silver glitter across the chest, on a black or white tee. Released alongside the single.',
    priceCents: 3500,
    photos: [
      {
        src: '/img/facetime-tee-black.jpg',
        alt: 'Black FaceTime Tee with the pink and silver FaceTime logo across the chest',
      },
      {
        src: '/img/facetime-tee-white.jpg',
        alt: 'White FaceTime Tee with the pink and silver FaceTime logo across the chest',
      },
    ],
    sizes: APPAREL_SIZES,
  },
  {
    sku: 'koi-ware-hoodie',
    title: 'Koi Ware Pullover Hoodie',
    category: 'Hoodies',
    format: 'Heavyweight fleece pullover, embroidered',
    description:
      'Brushed fleece inside, embroidered koi on the chest, and a roomy hood — the one piece that gets worn to every show.',
    priceCents: 6000,
    sizes: APPAREL_SIZES,
  },
  {
    sku: 'koi-ware-dad-cap',
    title: 'Koi Ware Dad Cap',
    category: 'Caps',
    format: 'Adjustable cotton twill cap, one size',
    description: 'Low-profile twill with an embroidered koi and a brass adjuster at the back.',
    priceCents: 2800,
  },
  {
    sku: 'koi-ware-sweatpants',
    title: 'Koi Ware Sweatpants',
    category: 'Sweats',
    format: 'Fleece jogger, tapered leg',
    description:
      'Matches the hoodie. Tapered leg, deep pockets, and a small koi embroidered above the cuff.',
    priceCents: 5500,
    sizes: APPAREL_SIZES,
  },
  {
    sku: 'koi-ware-jeans',
    title: 'Koi Ware Denim',
    category: 'Jeans',
    format: 'Rigid denim, straight fit',
    description:
      'A straight-fit rigid denim in a mid indigo wash, with a woven Koi Ware tab at the back pocket.',
    priceCents: 7500,
    sizes: WAIST_SIZES,
  },
  {
    sku: 'koi-ware-tote',
    title: 'Koi Ware Tote',
    category: 'Accessories',
    format: 'Heavy canvas tote, one size',
    priceCents: 2000,
  },
]

/** Order the merch sections render in. */
export const merchCategories: MerchCategory[] = [
  'T-Shirts',
  'Hoodies',
  'Caps',
  'Sweats',
  'Jeans',
  'Accessories',
]

export function findMerchItem(sku: string): MerchItem | undefined {
  return merch.find((item) => item.sku === sku)
}

/** Anything the checkout endpoint will sell, flattened so it can price either kind. */
export type Purchasable = Storefronts & {
  kind: 'music' | 'merch'
  sku: string
  title: string
  format: string
  description?: string
  priceCents: number
  /** Present when the buyer must choose a size before checking out. */
  sizes?: string[]
}

export function findPurchasable(sku: string): Purchasable | undefined {
  const product = findProduct(sku)
  if (product) {
    return {
      kind: 'music',
      sku: product.sku,
      title: product.title,
      format: product.format,
      description: product.description,
      priceCents: product.priceCents,
      bandcampUrl: product.bandcampUrl,
      shopifyHandle: product.shopifyHandle,
    }
  }

  const item = findMerchItem(sku)
  if (item) {
    return {
      kind: 'merch',
      sku: item.sku,
      title: item.title,
      format: item.format,
      description: item.description,
      priceCents: item.priceCents,
      sizes: item.sizes,
      bandcampUrl: item.bandcampUrl,
      shopifyHandle: item.shopifyHandle,
    }
  }

  return undefined
}

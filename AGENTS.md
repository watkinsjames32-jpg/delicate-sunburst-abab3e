# AGENTS.md

Official website for London Koi, a young R&B/soul recording artist from Birmingham, Alabama. Marketing site plus a small direct-to-fan store selling music downloads and Koi Ware merchandise, built with TanStack Start.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Forms | Netlify Forms (booking/contact) |
| Payments | Shopify (Storefront API cart checkout), PayPal (Orders v2 API) and Bandcamp (outbound links) |
| Database | Netlify Database (Postgres) via Drizzle ORM — PayPal orders |
| Language | TypeScript 5 |
| Package manager | pnpm (`pnpm-lock.yaml` is the source of truth) |
| Deployment | Netlify |

## Directory Structure

```
├── public
│   ├── favicon.ico
│   ├── __forms.html        # Static skeleton so Netlify's build bot detects the booking form
│   ├── audio/              # 30-second release previews (served directly, not via the Image CDN)
│   ├── img/                # Hero portrait, generated hero background + single cover art
│   └── video/              # Teaser clips for coming-soon cards (served directly, not via the Image CDN)
├── src
│   ├── components
│   │   └── site.tsx         # Shared nav + footer + preview player + Netlify Image CDN helper
│   ├── data
│   │   ├── catalog.ts       # Purchasable releases + Koi Ware merch (price, art, sizes)
│   │   └── events.ts        # Past Events shown under the bio (photos + videos)
│   ├── routes
│   │   ├── __root.tsx       # Root layout: HTML shell, page title/meta
│   │   ├── index.tsx        # Home page: hero, about, music, highlights, booking form
│   │   ├── music.tsx        # Store page: music + Koi Ware merch, Shopify + PayPal + Bandcamp buttons
│   │   ├── order.$token.tsx # Buyer's PayPal order page: download link or shipping confirmation
│   │   └── api
│   │       ├── checkout.ts  # POST → creates a Shopify cart, returns its checkout URL
│   │       ├── download.$token.ts # GET → master MP3 for a completed PayPal order
│   │       └── paypal
│   │           ├── checkout.ts # POST → creates a PayPal order, returns its approval URL
│   │           └── return.ts   # GET ← PayPal return: captures payment, redirects to /order/<token>
│   ├── server
│   │   ├── shopify.ts       # Server-only Storefront API client (never import in a component)
│   │   ├── bandcamp.ts      # Per-item Bandcamp link lookup
│   │   ├── paypal.ts        # Server-only PayPal Orders v2 client
│   │   ├── orders.ts        # PayPal order records in Netlify Database
│   │   ├── orders.functions.ts # Server function for the order page
│   │   ├── downloads.ts     # Masters in the `music-downloads` Blobs store
│   │   ├── storefront.ts    # Which storefronts can sell each item
│   │   ├── storefront.functions.ts # Server function the store page loads availability through
│   │   └── env.ts           # Loose environment variable lookup shared by the above
│   ├── router.tsx           # TanStack Router setup
│   └── styles.css           # Tailwind entry point
├── db/                       # Drizzle schema + client (Netlify Database)
├── drizzle.config.ts         # Migrations go to netlify/database/migrations
├── netlify.toml              # Build command + publish dir
└── package.json
```

## Key Concepts

The home page (`src/routes/index.tsx`) is a single page with anchor-linked sections (`#about`, `#past-events`, `#music`, `#merch`, `#highlights`, `#booking`). The store (`src/routes/music.tsx`) is the only other page. Nav and footer are shared through `src/components/site.tsx` so both pages stay in step. There is no CMS — releases and merch are typed arrays in `src/data/catalog.ts`.

The palette is a light blue theme: `sky` tones for backgrounds and eyebrow text, `slate` for body copy, and `amber` for primary buttons (picked up from the yellow blazer in the hero photo).

### Past Events

The Past Events section sits directly under the bio and is driven by `pastEvents` in
`src/data/events.ts`, newest first. Each event has a title, optional date/location/description,
and a `media` list. Photos go in `public/img/events/` and are served through the Image CDN;
videos go in `public/video/events/` and are served directly (an optional `poster` still can be
set). An event with no media shows a "Photos and video coming soon" tile, and any file that is
missing or unplayable hides itself, so media can be listed before it is uploaded. Convert HEIC
phone photos to JPEG first; phone videos should be MP4 (H.264) to play in every browser.

### Booking form

The booking form uses Netlify Forms. `public/__forms.html` is a hidden, build-time-only skeleton that lets Netlify's crawler register the `booking` form; the real form in `index.tsx` submits via `fetch` to `/__forms.html` (not `/`, since TanStack Start's SSR handler intercepts `/`). If more fields are added to the form, mirror them in `public/__forms.html` too.

### Music store

`/music` sells the digital releases and the Koi Ware merch listed in `src/data/catalog.ts` through
three storefronts, and every item can be sold on any of them:

- **Shopify**, via the Storefront API. The buyer picks a size on the card and clicks **Buy on
  Shopify**, which POSTs the SKU and size to `/api/checkout`. That looks up the matching product
  variant, creates a one-line Shopify cart, and returns the cart's `checkoutUrl` for the browser to
  go to. Shopify then takes the payment, collects the address, charges its own price, shipping and
  tax, sends the receipt, and holds the order for fulfilment in the Shopify admin.
- **Bandcamp**, via a plain link. Bandcamp has no checkout API, so **Buy on Bandcamp** is an `<a>`
  to the item's Bandcamp page, where the buyer pays and Bandcamp delivers the download (or ships
  the merch) itself.

- **PayPal**, via the Orders v2 REST API. **Pay with PayPal** POSTs the SKU and size to
  `/api/paypal/checkout`, which creates a PayPal order at the catalog price (plus flat merch
  shipping), records it in Netlify Database as `created`, and returns PayPal's approval URL.
  PayPal sends the buyer back to `/api/paypal/return`, which captures the payment, checks the
  captured amount against the record, and redirects to `/order/<token>`. Unlike the other two,
  this site does the fulfilment: singles are downloaded from `/api/download/<token>` (streamed
  from the `music-downloads` Blobs store, `MAX_DOWNLOADS` per purchase), and merch orders are
  kept in the `paypal_orders` table with size, buyer and shipping address. PayPal emails the
  seller for every payment, so that email plus the table is the packing list.

Shopify and Bandcamp don't send the buyer back to this site — their receipt and download come from
them. Only PayPal orders have an order page here.

**The store page sells through PayPal only**: every release and merch card has a single **Buy with
PayPal** button, always shown, and there are no Bandcamp or Shopify buttons. If PayPal can't take the
order (credentials missing or rejected, or a single whose master `<sku>.mp3` isn't in the
`music-downloads` store yet), `/api/paypal/checkout` returns a reason that is shown on the card and
logged. The home page's "Buy & Download" button goes to `/music`. `storeAvailability()` in
`src/server/storefront.ts` and the Shopify checkout (`/api/checkout`) are still in the code but no
longer used by the page.

#### Connecting Shopify

Set these site environment variables (in Shopify: *Settings → Apps and sales channels → Headless*,
or a custom app with Storefront API access, which needs the `unauthenticated_read_product_listings`
and `unauthenticated_write_checkouts` scopes):

| Variable | Value |
|----------|-------|
| `SHOPIFY_STORE_DOMAIN` | e.g. `koi-ware.myshopify.com` (a bare shop name or the admin URL also works) |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | The public Storefront API token, **or** |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | the private one — preferred if both are set |
| `SHOPIFY_API_VERSION` | Optional; defaults to `DEFAULT_API_VERSION` in `shopify.ts` |

Each SKU is matched to the Shopify product whose **handle** is, first match wins:
`SHOPIFY_HANDLE_<SKU>` from the environment, `shopifyHandle` on the item in `catalog.ts`, or the SKU
itself. Creating each Shopify product with the SKU as its handle (e.g. `koi-ware-hoodie`) therefore
needs no further configuration. A full `/products/<handle>` URL is accepted in place of a handle.

For sized items, each size in `catalog.ts` must equal the value of one of the product's variant
options in Shopify (e.g. a "Size" option with values `S`, `M`, …, or a "Waist" option `28`–`38`),
compared case-insensitively. One-size items use the first in-stock variant. A product that is not
found, or a size with no matching variant, gets a clear error on the card and a warning in the
function log; a size that is out of stock says it is sold out. If Shopify is unreachable when the
page loads, the Shopify buttons are simply hidden until it answers again.

Singles sold through Shopify need Shopify to deliver the file — attach each master with Shopify's
Digital Downloads app (or similar) to the product.

#### Connecting PayPal

Create a REST app at developer.paypal.com (*Apps & Credentials*, Live tab) on the Londonkoi PayPal
business account, and set:

| Variable | Value |
|----------|-------|
| `PAYPAL_CLIENT_ID` | The app's Client ID |
| `PAYPAL_CLIENT_SECRET` | The app's Secret (also read from `LONDONKOI_PAYPAL_CLIENT_SECRET`, where the Londonkoi app's secret is stored) |
| `PAYPAL_ENV` | Optional; `sandbox` to test with sandbox credentials, otherwise live |
| `PAYPAL_SHIPPING_USD` | Optional flat shipping added to each merch order, e.g. `6.50`; free when unset |
| `PAYPAL_PAYEE_EMAIL` | Optional; the PayPal account payments go to. Defaults to `DEFAULT_PAYEE_EMAIL` in `paypal.ts` — `reneegreen96@yahoo.com`, Tomeka Jones's account |

The Client ID is also read from `PAYPAL_LONDONKOI_CLIENT_ID`. A variable whose name only *starts* with `PAYPAL_CLIENT_ID` (e.g. `PAYPAL_CLIENT_ID_BAAD_…`, which is how the Londonkoi Client ID is currently saved) is also tried, after the exact names. When several Client ID / Secret
pairs are present, `paypal.ts` tries each and signs in with the first one PayPal accepts.

Every order names that account as its `payee`, so the money is paid to Tomeka Jones's PayPal account
even if the REST app whose Client ID/Secret sign the API calls belongs to another PayPal account.
The Client ID/Secret still have to be valid Live credentials for PayPal checkout to work at all.

PayPal charges `priceCents` from `catalog.ts` directly, so for PayPal that price is authoritative.
An order whose captured amount doesn't match its record, or that PayPal reports paying to an
account other than the payee, is saved as `mismatch` and never delivered; a capture PayPal is still clearing is `pending`.

#### Connecting Bandcamp

Where an item's Bandcamp link comes from, first match wins:

1. A per-item variable from the environment, named after the SKU or the item's title, as
   `BANDCAMP_URL_<name>` or `BANDCAMP_<name>_URL` — e.g.
   `BANDCAMP_URL_RIDE_THE_WAVE`, `BANDCAMP_RIDE_THE_WAVE_URL`, or `BANDCAMP_FACETIME_URL` for
   FaceTime (SKU `facetime-single`). SKU names are checked before title names.
2. `bandcampUrl` on the item in `catalog.ts`
3. `BANDCAMP_URL`, the artist's Bandcamp page, or `ARTIST_BANDCAMP_URL` in `bandcamp.ts`
   (`https://londonkoi.bandcamp.com`) when that is unset. Releases link to that page and merch to
   its `/merch` section, so every item always has a Buy on Bandcamp button.

Only absolute `https` URLs are accepted (any host, since Bandcamp Pro allows a custom domain); a
placeholder (including template-looking hosts such as `bandcamp.FaceTime.URL`, anything
ending in `.url`/`.example`/`.test`/`.invalid`/`.localhost`, or a host with no dot) is ignored and the next source in the list is used instead.

#### Environment variables in general

All the names above are matched loosely by `src/server/env.ts` — casing, dashes and underscores
are ignored, so `SHOPIFY_HANDLE_KOI_WARE_HOODIE` and `Shopify_Handle_koi-ware-hoodie` are the same
variable. Per-item variables use the SKU:

| Item | SKU |
|------|-----|
| FaceTime | `facetime-single` |
| Ride The Wave | `ride-the-wave` |
| Be Great | `be-great` |
| Special | `special` |
| Koi Ware Logo Tee | `koi-ware-logo-tee` |
| FaceTime Tee | `koi-ware-facetime-tee` |
| Koi Ware Pullover Hoodie | `koi-ware-hoodie` |
| Koi Ware Dad Cap | `koi-ware-dad-cap` |
| Koi Ware Sweatpants | `koi-ware-sweatpants` |
| Koi Ware Denim | `koi-ware-jeans` |
| Koi Ware Tote | `koi-ware-tote` |

#### Prices

Shopify and Bandcamp charge the price set on them, while PayPal charges `priceCents` from
`catalog.ts` itself. Keep Shopify and Bandcamp in step with it by hand, or the card will show a price
the buyer is not charged.

The `format` string on each release names its master's real bitrate and runtime, so re-encoding or
replacing a master means updating its `singleFormat(...)` call in `catalog.ts` to match. The
masters that the earlier Stripe store sold are in the `music-downloads` Netlify Blobs store as
`<sku>.mp3`; PayPal purchases are delivered from there, and they are also the files to upload to
Bandcamp and Shopify. A new single needs its master uploaded there before PayPal offers it.
Bandcamp wants lossless uploads, so the store also holds `facetime-single.wav` — a 16-bit / 44.1 kHz
WAV decoded from the FaceTime MP3, trimmed to its gapless length. It is converted from a lossy
file, so an original lossless bounce is better if one turns up.

`catalog.ts` also exports `upcoming` — announced titles that deliberately have no SKU or price. They render as "Coming soon" cards, and because they are not in `products` the checkout endpoint rejects them outright. Promote one by moving it into `products` with a SKU, then list it on Shopify and/or Bandcamp.

An upcoming title may also name a `video` — a teaser clip in `public/video/`, played in the card's square slot. Clips are referenced directly rather than through the Image CDN, which only transforms images. If the file is missing or the browser cannot play it, the card falls back to the plain dashed tile, so a clip can be announced in the catalog before it is uploaded.

A release may also name a `preview` — a 30-second clip in `public/audio/`, played by the card's
"Play 30s preview" button. Only the clip is public; the full track is only sold through Shopify or
Bandcamp, so a preview is cut from the master rather than being the master. Clips are copied frame-by-frame
out of the source MP3 (no re-encode), which is why their bitrate matches the release's `format`
line. The player pauses any other clip already playing, and hides itself if the file is missing or
the browser refuses it — so a preview can be listed before it is uploaded.

`PreviewPlayer` lives in `src/components/site.tsx` because both pages use it: the store cards, and
the home page's New Single section, which features `featuredProduct` from the catalog. So giving a
release a `preview` is the only step needed to light up its play button everywhere it appears.

`cover`, `description` and `preview` are all optional. A release without artwork renders a titled gradient tile instead, and one without a blurb simply shows title, format, and price — so a new single can go on sale before its artwork or copy exists.

### Koi Ware merch

`merch` in `src/data/catalog.ts` is London's physical clothing line, grouped into the categories
listed in `merchCategories` (T-Shirts, Hoodies, Caps, Sweats, Jeans, Accessories). A merch item
may list `sizes`; when it is on Shopify the buyer picks one on the card before checkout, and when
it is only on Bandcamp the sizes are listed for reference and chosen on Bandcamp. Items without
`sizes` render as "One size".

`findPurchasable(sku)` is the single lookup the checkout endpoint uses — it resolves a SKU to either
a release or a merch item and flattens both into one priced shape, so only that helper has to know
the difference. Shipping rates, shipping countries and stock live in Shopify and Bandcamp, and
their orders are packed from each platform's own admin; PayPal merch orders use the flat
`PAYPAL_SHIPPING_USD` rate, have no stock tracking, and are packed from the `paypal_orders` table. Merch items have no cover photos yet, so cards render a koi-marked gradient tile keyed to the
category; drop a photo in `public/img/` and set `cover` to replace it, or set `photos` (each with `src` and `alt`) to show several with a thumbnail switcher — the Koi Ware Logo Tee and the FaceTime Tee use this for their black and white colourways (the FaceTime Tee photos are flat mockups of the FaceTime logo on a tee, to swap for real photos once printed). Phone photos arrive as HEIC, which browsers can't display, so convert them to JPEG first.

### Images

`public/img/london-koi-portrait.jpg` is the artist's official promo photo and anchors the home page hero. `facetime-new-hot-single.jpg` is the official promo graphic for the FaceTime single, headlined "New Hot Single"; it fills the square art slot in the home page New Hot Single section and is also the FaceTime release's `cover`, so it is the artwork on the featured card on `/music`. `hero-bg.png` and `facetime-cover.png` are AI-generated artwork (koi/soul-music motifs, no depiction of the artist's likeness); Both are currently unused — the hero moved to a light blue background, and the FaceTime card now carries the real promo flyer instead of the generated cover. All of them are served through the Netlify Image CDN (`/.netlify/images?url=...&w=...&fm=webp`) rather than referenced directly — use the `img()` helper in `src/components/site.tsx`, and see the `netlify-image-cdn` skill for the query parameters.

## Development Commands

```bash
pnpm install     # Install dependencies (uses pnpm-lock.yaml)
pnpm dev         # Start dev server
pnpm build       # Production build
npx tsc --noEmit # Typecheck
```

## Conventions

- Components: PascalCase. Page-specific components stay colocated in their route file; anything shared between pages goes in `src/components/site.tsx`
- Tailwind utility classes for all styling
- No global state management — the pages are static content plus one form and the checkout calls
- Database schema lives in `db/schema.ts`; after changing it run `npx drizzle-kit generate --name <change>` (never apply migrations by hand)
- Secrets are read only inside `src/server/*` and `src/routes/api/*`; never import those modules from a component

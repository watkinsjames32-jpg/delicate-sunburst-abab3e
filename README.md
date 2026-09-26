# London Koi — Official Website

The official website for London Koi, a 12-year-old soul and R&B vocalist from Birmingham, Alabama, built to spotlight her new single "FaceTime" and route booking/press inquiries to one place.

## What's on the site

- **Hero** — name, tagline, and quick links to the single and the booking form
- **About** — her story and background, from early vocal training to studying at the Alabama School of Fine Arts
- **Music** — a spotlight on the new single "FaceTime"
- **Koi Ware** — her merchandise line (tees, hoodies, caps, sweats, denim and accessories), with the full range on the store page
- **Highlights** — notable performances (Caesars Superdome anthem, the mayor's inauguration, etc.)
- **Booking & Contact** — a form for booking, press, and partnership inquiries, powered by Netlify Forms

## Tech

- [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router)
- Vite 7
- Tailwind CSS 4
- Netlify Forms for the booking form
- Netlify Image CDN for optimized image delivery
- Shopify (Storefront API checkout) and Bandcamp for the store — see `AGENTS.md` for setup

## Running locally

```bash
npm install
npm run dev
```

The dev server runs on port 3000. When testing locally with the Netlify CLI (`netlify dev`), form submissions are captured by Netlify's local emulator.

## Deploying

The site deploys on Netlify. `netlify.toml` sets the build command (`vite build`) and publish directory (`dist/client`). Form submissions collected through the booking form appear under **Forms** in the Netlify dashboard.

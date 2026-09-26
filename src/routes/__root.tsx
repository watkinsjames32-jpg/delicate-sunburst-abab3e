import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'


import '../styles.css'

const siteName = 'London Koi | Official Site'
const siteDescription =
  "London Koi is a 13-year-old soul and R&B vocalist from Birmingham, Alabama. Listen to her new single \"FaceTime.\""
export const siteUrl = 'https://londonkoi.org'
/**
 * Social cards are fetched by third-party scrapers, so the promo photo is linked
 * directly as a plain JPEG rather than through the Image CDN's WebP output.
 */
const siteImage = `${siteUrl}/img/london-koi-portrait.jpg`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'London Koi',
      },
      {
        property: 'og:url',
        content: siteUrl,
      },
      {
        property: 'og:image',
        content: siteImage,
      },
      {
        property: 'og:image:alt',
        content: 'London Koi',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:image',
        content: siteImage,
      },
      {
        name: 'theme-color',
        content: '#f0f9ff',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

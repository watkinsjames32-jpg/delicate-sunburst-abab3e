# Hosted checkout for London Koi

The store reads one Netlify environment variable per product. Set each to the **actual product payment page** created in the London Koi PayPal Business or Bandcamp account:

| Product | Netlify variable |
| --- | --- |
| FaceTime | `CHECKOUT_URL_FACETIME_SINGLE` |
| Ride The Wave | `CHECKOUT_URL_RIDE_THE_WAVE` |
| Be Great | `CHECKOUT_URL_BE_GREAT` |
| Special | `CHECKOUT_URL_SPECIAL` |
| Koi Ware Logo Tee | `CHECKOUT_URL_KOI_WARE_LOGO_TEE` |
| FaceTime Tee | `CHECKOUT_URL_KOI_WARE_FACETIME_TEE` |
| Koi Ware Pullover Hoodie | `CHECKOUT_URL_KOI_WARE_HOODIE` |
| Koi Ware Dad Cap | `CHECKOUT_URL_KOI_WARE_DAD_CAP` |
| Koi Ware Sweatpants | `CHECKOUT_URL_KOI_WARE_SWEATPANTS` |
| Koi Ware Denim | `CHECKOUT_URL_KOI_WARE_JEANS` |
| Koi Ware Tote | `CHECKOUT_URL_KOI_WARE_TOTE` |

Use a Bandcamp track listing for music if automatic downloads are needed. A PayPal payment link takes payment but does not deliver an MP3. For merchandise, create the product with the available sizes, shipping, and stock in the hosted checkout before setting the URL. The displayed price on this site is maintained separately in `src/data/catalog.ts`; match it to the checkout price.

Only HTTPS links to PayPal or Bandcamp are accepted. Missing or incomplete links show “Coming soon” instead of a purchase button. After changing a variable, redeploy the Netlify site, visit `/music`, and check that each enabled button opens the intended product, price, and seller account. Complete a small real purchase and verify delivery or fulfillment before advertising the store as live.

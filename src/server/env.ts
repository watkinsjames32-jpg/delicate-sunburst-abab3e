/**
 * Reads store settings from the environment.
 *
 * Variable names get typed by hand into the Netlify UI, so they are matched
 * loosely: casing, dashes and underscores are all ignored.
 * `SHOPIFY_STORE_DOMAIN`, `Shopify_Store_Domain` and `shopify-store-domain` are
 * one and the same variable, because a setting the store cannot find looks
 * exactly like no setting at all.
 *
 * Server-only: it reads `process.env`. Never import it from a component.
 */

export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** The trimmed value of the variable matching `name`, or null if unset or blank. */
export function readEnv(name: string): string | null {
  const wanted = normaliseName(name)

  for (const [key, value] of Object.entries(process.env)) {
    const candidate = value?.trim()
    if (candidate && normaliseName(key) === wanted) return candidate
  }

  return null
}

/** A per-item variable, e.g. `BANDCAMP_URL_KOI_WARE_HOODIE` for SKU `koi-ware-hoodie`. */
export function readItemEnv(prefix: string, sku: string): string | null {
  return readEnv(`${prefix}_${sku}`)
}

/**
 * Values of every variable whose name starts with `prefix` but carries extra
 * characters after it, e.g. `PAYPAL_CLIENT_ID_AB12` for `PAYPAL_CLIENT_ID` —
 * what a pasted value ends up as when part of it lands in the name field.
 */
export function readEnvsWithPrefix(prefix: string): string[] {
  const wanted = normaliseName(prefix)
  const values: string[] = []

  for (const [key, value] of Object.entries(process.env)) {
    const candidate = value?.trim()
    const name = normaliseName(key)
    if (candidate && name.startsWith(wanted) && name !== wanted) values.push(candidate)
  }

  return values
}

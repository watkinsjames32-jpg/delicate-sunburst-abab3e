import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * One row per PayPal checkout. Written as `created` when the buyer is sent to
 * PayPal, and moved to `completed` once the payment has been captured.
 *
 * Singles are delivered through `access_token`, which keys both the order page
 * and the download link. Merch rows hold what is needed to pack and post the
 * order: the size and the shipping address PayPal collected.
 */
export const paypalOrders = pgTable('paypal_orders', {
  id: serial().primaryKey(),
  paypalOrderId: text('paypal_order_id').notNull().unique(),
  /** Unguessable key for the buyer's order page and download. */
  accessToken: text('access_token').notNull().unique(),
  status: text().notNull().default('created'),
  kind: text().notNull(),
  sku: text().notNull(),
  title: text().notNull(),
  size: text(),
  itemCents: integer('item_cents').notNull(),
  shippingCents: integer('shipping_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),
  currency: text().notNull().default('USD'),
  captureId: text('capture_id'),
  buyerName: text('buyer_name'),
  buyerEmail: text('buyer_email'),
  shippingAddress: jsonb('shipping_address'),
  downloadCount: integer('download_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
})

export type PaypalOrder = typeof paypalOrders.$inferSelect

/**
 * Photos, flyers, videos and music uploaded from `/upload`. The file itself
 * lives in the `site-uploads` Blobs store, split into `<blob_key>/<n>` chunks
 * of `chunk_size` bytes so each request stays under the function body limit.
 * A row is `uploading` until every chunk has arrived, then `ready`, at which
 * point it shows in the home page Latest section.
 */
export const siteUploads = pgTable('site_uploads', {
  id: serial().primaryKey(),
  blobKey: text('blob_key').notNull().unique(),
  kind: text().notNull(),
  title: text().notNull(),
  caption: text(),
  filename: text().notNull(),
  contentType: text('content_type').notNull(),
  size: integer().notNull(),
  chunkSize: integer('chunk_size').notNull(),
  chunkCount: integer('chunk_count').notNull(),
  status: text().notNull().default('uploading'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type SiteUpload = typeof siteUploads.$inferSelect

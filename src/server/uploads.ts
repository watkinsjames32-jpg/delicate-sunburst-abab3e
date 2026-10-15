/**
 * Photos, flyers, videos and music uploaded from `/upload`, so new media can go
 * on the site without touching GitHub.
 *
 * The record lives in the `site_uploads` table and the file in the
 * `site-uploads` Blobs store. Function requests are capped at a few megabytes,
 * so the browser sends each file in `CHUNK_SIZE` pieces, stored as
 * `<blob_key>/<n>`, and `/api/media/<id>` stitches them back together
 * (honouring Range requests, which video players rely on).
 *
 * Uploading is protected by the `UPLOAD_PASSWORD` site environment variable;
 * while it is unset, uploads are switched off.
 *
 * Server-only. Never import it from a component.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { getStore } from '@netlify/blobs'
import { desc, eq } from 'drizzle-orm'

import { db } from '../../db'
import { siteUploads, type SiteUpload } from '../../db/schema'
import { chunkedStream, parseRange } from './chunked-media'
import { readEnv } from './env'

/** 3 MiB keeps each chunk well under the function request body limit. */
export const CHUNK_SIZE = 3 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024

export const UPLOAD_KINDS = ['photo', 'flyer', 'video', 'music'] as const
export type UploadKind = (typeof UPLOAD_KINDS)[number]

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_TYPES: Record<UploadKind, string[]> = {
  photo: IMAGE_TYPES,
  flyer: [...IMAGE_TYPES, 'application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  music: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave'],
}

const store = () => getStore('site-uploads')

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function uploadsEnabled(): boolean {
  return readEnv('UPLOAD_PASSWORD') !== null
}

/** Throws unless the request carries the upload password in `x-upload-password`. */
export function requireUploader(request: Request): void {
  const expected = readEnv('UPLOAD_PASSWORD')
  if (!expected) {
    throw new UploadError('Uploads are not switched on yet: set UPLOAD_PASSWORD in the Netlify site settings.', 503)
  }
  const given = request.headers.get('x-upload-password') ?? ''
  if (!given || !timingSafeEqual(digest(given), digest(expected))) {
    throw new UploadError('Wrong upload password.', 401)
  }
}

/** Uploads come from the site's own upload page only. */
export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) throw new UploadError('Invalid origin.', 403)
}

export function errorResponse(error: unknown): Response {
  if (error instanceof UploadError) return Response.json({ error: error.message }, { status: error.status })
  console.error('Upload failed', error)
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Records a new upload and returns what the browser needs to send its chunks. */
export async function startUpload(input: Record<string, unknown>): Promise<SiteUpload> {
  const kind = input.kind as UploadKind
  if (!UPLOAD_KINDS.includes(kind)) throw new UploadError('Choose photo, flyer, video or music.')

  const filename = cleanText(input.filename, 200) || 'upload'
  const contentType = cleanText(input.contentType, 100).toLowerCase()
  if (/\.(heic|heif)$/i.test(filename) || contentType.includes('heic') || contentType.includes('heif')) {
    throw new UploadError('iPhone HEIC photos do not display in browsers. Export the photo as JPEG first (or set the camera to "Most Compatible").')
  }
  if (!ALLOWED_TYPES[kind].includes(contentType)) {
    throw new UploadError(`That file type (${contentType || 'unknown'}) can't be used for a ${kind}.`)
  }

  const size = Number(input.size)
  if (!Number.isInteger(size) || size <= 0) throw new UploadError('The file is empty.')
  if (size > MAX_UPLOAD_BYTES) throw new UploadError('Files can be up to 500 MB.')

  const title = cleanText(input.title, 120) || filename.replace(/\.[^.]+$/, '')
  const caption = cleanText(input.caption, 500) || null

  const [row] = await db
    .insert(siteUploads)
    .values({
      blobKey: randomBytes(16).toString('hex'),
      kind,
      title,
      caption,
      filename,
      contentType: contentType === 'audio/mp3' ? 'audio/mpeg' : contentType,
      size,
      chunkSize: CHUNK_SIZE,
      chunkCount: Math.ceil(size / CHUNK_SIZE),
    })
    .returning()
  return row
}

async function findUpload(id: number): Promise<SiteUpload | null> {
  if (!Number.isInteger(id) || id <= 0) return null
  const [row] = await db.select().from(siteUploads).where(eq(siteUploads.id, id)).limit(1)
  return row ?? null
}

function chunkLength(upload: SiteUpload, part: number): number {
  return part === upload.chunkCount - 1 ? upload.size - part * upload.chunkSize : upload.chunkSize
}

export async function saveChunk(id: number, part: number, body: ArrayBuffer): Promise<void> {
  const upload = await findUpload(id)
  if (!upload || upload.status !== 'uploading') throw new UploadError('Upload not found.', 404)
  if (!Number.isInteger(part) || part < 0 || part >= upload.chunkCount) throw new UploadError('Bad chunk number.')
  if (body.byteLength !== chunkLength(upload, part)) throw new UploadError('Chunk size does not match.')

  await store().set(`${upload.blobKey}/${part}`, body)
}

/** Marks an upload `ready` once every chunk is stored, which publishes it. */
export async function finishUpload(id: number): Promise<void> {
  const upload = await findUpload(id)
  if (!upload) throw new UploadError('Upload not found.', 404)
  if (upload.status === 'ready') return

  const { blobs } = await store().list({ prefix: `${upload.blobKey}/` })
  if (blobs.length !== upload.chunkCount) throw new UploadError('Some of the file is missing. Please upload it again.', 409)

  await db.update(siteUploads).set({ status: 'ready' }).where(eq(siteUploads.id, id))
}

export async function deleteUpload(id: number): Promise<void> {
  const upload = await findUpload(id)
  if (!upload) return

  const { blobs } = await store().list({ prefix: `${upload.blobKey}/` })
  await Promise.all(blobs.map((blob) => store().delete(blob.key)))
  await db.delete(siteUploads).where(eq(siteUploads.id, id))
}

/** Every upload, newest first, including unfinished ones so they can be cleared. */
export async function allUploads(): Promise<SiteUpload[]> {
  return db.select().from(siteUploads).orderBy(desc(siteUploads.createdAt))
}

export type PublicUpload = {
  id: number
  kind: UploadKind
  title: string
  caption: string | null
  contentType: string
  url: string
  createdAt: string
}

export function mediaUrl(upload: Pick<SiteUpload, 'id' | 'filename'>): string {
  return `/api/media/${upload.id}/${encodeURIComponent(upload.filename.replace(/[^\w.-]+/g, '-'))}`
}

export function toPublic(upload: SiteUpload): PublicUpload {
  return {
    id: upload.id,
    kind: upload.kind as UploadKind,
    title: upload.title,
    caption: upload.caption,
    contentType: upload.contentType,
    url: mediaUrl(upload),
    createdAt: upload.createdAt.toISOString(),
  }
}

/** Finished uploads for the home page, newest first. */
export async function publishedUploads(): Promise<PublicUpload[]> {
  const rows = await db
    .select()
    .from(siteUploads)
    .where(eq(siteUploads.status, 'ready'))
    .orderBy(desc(siteUploads.createdAt))
  return rows.map(toPublic)
}

/** Serves a finished upload, stitching its chunks together and honouring a Range header. */
export async function mediaResponse(id: number, request: Request): Promise<Response> {
  const upload = await findUpload(id)
  if (!upload || upload.status !== 'ready') return new Response('Not found.', { status: 404 })

  const range = parseRange(request.headers.get('range'), upload.size)
  if (!range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${upload.size}` } })
  const { start, end, partial } = range

  const body = chunkedStream(
    (part) => store().get(`${upload.blobKey}/${part}`, { type: 'arrayBuffer' }),
    upload.chunkSize,
    start,
    end,
  )

  const headers: Record<string, string> = {
    'Content-Type': upload.contentType,
    'Content-Length': String(end - start + 1),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
    'Content-Disposition': `inline; filename="${upload.filename.replace(/[^\w .()-]/g, '')}"`,
  }
  if (partial) headers['Content-Range'] = `bytes ${start}-${end}/${upload.size}`
  return new Response(body, { status: partial ? 206 : 200, headers })
}

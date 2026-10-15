import { createFileRoute } from '@tanstack/react-router'

import {
  CHUNK_SIZE,
  allUploads,
  deleteUpload,
  errorResponse,
  mediaUrl,
  requireSameOrigin,
  requireUploader,
  startUpload,
} from '../../../server/uploads'

/**
 * The upload page's file list.
 *
 * GET → every upload, newest first. POST → records a new upload and returns
 * its id and chunk size. DELETE `?id=` → removes an upload and its file.
 */
export const Route = createFileRoute('/api/upload/files')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          requireUploader(request)
          const rows = await allUploads()
          return Response.json({
            uploads: rows.map((row) => ({
              id: row.id,
              kind: row.kind,
              title: row.title,
              caption: row.caption,
              filename: row.filename,
              contentType: row.contentType,
              size: row.size,
              status: row.status,
              url: mediaUrl(row),
              createdAt: row.createdAt.toISOString(),
            })),
          })
        } catch (error) {
          return errorResponse(error)
        }
      },
      POST: async ({ request }) => {
        try {
          requireSameOrigin(request)
          requireUploader(request)
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
          const upload = await startUpload(body)
          return Response.json({ id: upload.id, chunkSize: CHUNK_SIZE, chunkCount: upload.chunkCount })
        } catch (error) {
          return errorResponse(error)
        }
      },
      DELETE: async ({ request }) => {
        try {
          requireSameOrigin(request)
          requireUploader(request)
          await deleteUpload(Number(new URL(request.url).searchParams.get('id')))
          return new Response(null, { status: 204 })
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

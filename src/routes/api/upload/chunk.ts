import { createFileRoute } from '@tanstack/react-router'

import { errorResponse, requireSameOrigin, requireUploader, saveChunk } from '../../../server/uploads'

/** PUT `?id=&part=` with the raw bytes of one chunk of an upload. */
export const Route = createFileRoute('/api/upload/chunk')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        try {
          requireSameOrigin(request)
          requireUploader(request)
          const params = new URL(request.url).searchParams
          await saveChunk(Number(params.get('id')), Number(params.get('part')), await request.arrayBuffer())
          return new Response(null, { status: 204 })
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

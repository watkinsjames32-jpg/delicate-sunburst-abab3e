import { createFileRoute } from '@tanstack/react-router'

import { mediaResponse } from '../../server/uploads'

/**
 * GET → a file uploaded from `/upload`. The trailing name is only there so
 * saved files get a sensible filename; the id picks the upload.
 */
export const Route = createFileRoute('/api/media/$id/$name')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          return await mediaResponse(Number(params.id), request)
        } catch (error) {
          console.error('Media request failed', error)
          return new Response('Media temporarily unavailable.', { status: 503 })
        }
      },
    },
  },
})

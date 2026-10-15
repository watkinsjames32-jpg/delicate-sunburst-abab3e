import { createFileRoute } from '@tanstack/react-router'

import { errorResponse, requireSameOrigin, requireUploader } from '../../../server/uploads'

/** POST → 204 if the `x-upload-password` header is right, so the upload page can unlock. */
export const Route = createFileRoute('/api/upload/session')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireSameOrigin(request)
          requireUploader(request)
          return new Response(null, { status: 204 })
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

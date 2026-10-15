import { createFileRoute } from '@tanstack/react-router'

import { errorResponse, finishUpload, requireSameOrigin, requireUploader } from '../../../server/uploads'

/** POST `?id=` once every chunk is sent; publishes the upload on the home page. */
export const Route = createFileRoute('/api/upload/finish')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          requireSameOrigin(request)
          requireUploader(request)
          await finishUpload(Number(new URL(request.url).searchParams.get('id')))
          return new Response(null, { status: 204 })
        } catch (error) {
          return errorResponse(error)
        }
      },
    },
  },
})

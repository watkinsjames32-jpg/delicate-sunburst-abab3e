/**
 * Range handling for files stored as fixed-size chunks (see `uploads.ts`).
 * Kept free of imports so `tests/uploads.test.mjs` can exercise it directly.
 */

export type ByteRange = { start: number; end: number; partial: boolean }

/** The bytes a `Range` header asks for, the whole file without one, or null if unsatisfiable. */
export function parseRange(header: string | null, size: number): ByteRange | null {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/)
  if (!match || (!match[1] && !match[2])) return { start: 0, end: size - 1, partial: false }

  let start: number
  let end = size - 1
  if (match[1]) {
    start = Number(match[1])
    if (match[2]) end = Math.min(Number(match[2]), size - 1)
  } else {
    start = Math.max(0, size - Number(match[2]))
  }
  if (start > end || start >= size) return null
  return { start, end, partial: true }
}

/** Streams bytes `start`–`end` (inclusive) of a file split into `chunkSize` pieces. */
export function chunkedStream(
  getChunk: (part: number) => Promise<ArrayBuffer | null>,
  chunkSize: number,
  start: number,
  end: number,
): ReadableStream<Uint8Array> {
  const firstPart = Math.floor(start / chunkSize)
  const lastPart = Math.floor(end / chunkSize)
  let part = firstPart

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (part > lastPart) return controller.close()
      const data = await getChunk(part)
      if (!data) return controller.error(new Error(`Missing chunk ${part}`))
      const offset = part * chunkSize
      const from = part === firstPart ? start - offset : 0
      const to = part === lastPart ? end - offset + 1 : data.byteLength
      controller.enqueue(new Uint8Array(data, from, to - from))
      part++
    },
  })
}

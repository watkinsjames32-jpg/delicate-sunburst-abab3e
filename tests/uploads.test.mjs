import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Uploads are stored in fixed-size chunks; check they stitch back together exactly.
const dir = await mkdtemp(join(tmpdir(), 'londonkoi-uploads-'))
await writeFile(join(dir, 'package.json'), '{"type":"module"}')
const source = await readFile(new URL('../src/server/chunked-media.ts', import.meta.url), 'utf8')
const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
await writeFile(join(dir, 'chunked-media.js'), result.outputText)
const { chunkedStream, parseRange } = await import(pathToFileURL(join(dir, 'chunked-media.js')))

const CHUNK = 1000
const file = randomBytes(3500)
const chunks = []
for (let i = 0; i < file.length; i += CHUNK) chunks.push(file.subarray(i, i + CHUNK))
const getChunk = async (part) => {
  const c = chunks[part]
  return c ? c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength) : null
}

async function read(start, end) {
  return Buffer.from(await new Response(chunkedStream(getChunk, CHUNK, start, end)).arrayBuffer())
}

test('whole file', async () => {
  const range = parseRange(null, file.length)
  assert.deepEqual(range, { start: 0, end: 3499, partial: false })
  assert.ok((await read(range.start, range.end)).equals(file))
})

test('ranges across, within and at the end of chunks', async () => {
  for (const [header, start, end] of [
    ['bytes=990-2010', 990, 2010],
    ['bytes=1200-1300', 1200, 1300],
    ['bytes=3000-', 3000, 3499],
    ['bytes=-100', 3400, 3499],
    ['bytes=0-99999', 0, 3499],
    ['bytes=0-0', 0, 0],
  ]) {
    const range = parseRange(header, file.length)
    assert.deepEqual(range, { start, end, partial: true }, header)
    assert.ok((await read(start, end)).equals(file.subarray(start, end + 1)), header)
  }
})

test('unsatisfiable range', () => {
  assert.equal(parseRange('bytes=3500-', file.length), null)
  assert.equal(parseRange('bytes=20-10', file.length), null)
})

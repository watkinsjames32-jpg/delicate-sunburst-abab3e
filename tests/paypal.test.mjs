import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Exercise the production PayPal client with mocked REST responses, never real charges.
const dir = await mkdtemp(join(tmpdir(), 'londonkoi-paypal-'))
await writeFile(join(dir, 'package.json'), '{"type":"module"}')
for (const name of ['env', 'paypal']) {
  const source = await readFile(new URL(`../src/server/${name}.ts`, import.meta.url), 'utf8')
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  await writeFile(join(dir, `${name}.js`), result.outputText.replace("from './env'", "from './env.js'"))
}
const paypal = await import(pathToFileURL(join(dir, 'paypal.js')))
const saved = { ...process.env }
for (const key of Object.keys(process.env)) if (key.startsWith('PAYPAL') || key.startsWith('LONDONKOI_PAYPAL')) delete process.env[key]
process.env.PAYPAL_CLIENT_ID = 'test-client'
process.env.PAYPAL_CLIENT_SECRET = 'test-secret'
process.env.PAYPAL_ENV = 'sandbox'
const originalFetch = globalThis.fetch
const calls = []
let replies = []
globalThis.fetch = async (url, init) => {
  calls.push({ url, init })
  if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'mock-token', expires_in: 3600 })
  const reply = replies.shift()
  assert.ok(reply, 'Unexpected API call')
  return Response.json(reply.body, { status: reply.status ?? 200 })
}
const product = { kind: 'music', sku: 'facetime-single', title: 'FaceTime', priceCents: 150 }
const completed = { id: 'TESTORDER123456789', status: 'COMPLETED', purchase_units: [{ payee: { email_address: paypal.payeeEmail() }, payments: { captures: [{ id: 'CAPTURE123', status: 'COMPLETED', amount: { value: '1.50', currency_code: 'USD' } }] } }] }
try {
  await test('create uses catalog price, no shipping for music, and a stable request ID', async () => {
    replies = [{ body: { id: 'TESTORDER123456789', links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=TESTORDER123456789' }] } }]
    const order = await paypal.createPaypalOrder(product, undefined, { origin: 'https://londonkoi.org', requestId: 'stable-id' })
    assert.equal(order.totalCents, 150)
    const request = calls.at(-1)
    const body = JSON.parse(request.init.body)
    assert.equal(body.purchase_units[0].amount.value, '1.50')
    assert.equal(body.payment_source.paypal.experience_context.shipping_preference, 'NO_SHIPPING')
    assert.equal(request.init.headers['PayPal-Request-Id'], 'stable-id')
  })
  await test('merch preserves chosen variant and adds shipping', async () => {
    process.env.PAYPAL_SHIPPING_USD = '6.50'
    replies = [{ body: { id: 'TESTORDER123456789', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow' }] } }]
    const order = await paypal.createPaypalOrder({ ...product, kind: 'merch', priceCents: 2500 }, 'M, Black', { origin: 'https://londonkoi.org', requestId: 'merch-id' })
    assert.equal(order.totalCents, 3150)
    const body = JSON.parse(calls.at(-1).init.body)
    assert.match(body.purchase_units[0].items[0].name, /M, Black/)
    assert.equal(body.payment_source.paypal.experience_context.shipping_preference, 'GET_FROM_FILE')
  })
  await test('invalid approval URLs cannot redirect customers', async () => {
    for (const url of ['https://evil.example/pay', 'https://www.paypal.com.evil.example/', 'javascript:alert(1)', 'https://user@www.paypal.com/']) assert.equal(paypal.isPaypalApprovalUrl(url), false)
    replies = [{ body: { id: 'TESTORDER123456789', links: [{ rel: 'payer-action', href: 'https://evil.example/' }] } }]
    await assert.rejects(paypal.createPaypalOrder(product, undefined, { origin: 'https://londonkoi.org', requestId: 'bad-url' }))
  })
  await test('capture retry reads an already captured order without a second charge', async () => {
    replies = [{ status: 422, body: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } }, { body: completed }]
    const payment = await paypal.capturePaypalOrder('TESTORDER123456789')
    assert.equal(payment.paid, true)
    assert.equal(payment.amountCents, 150)
    assert.equal(calls.at(-1).init.method, 'GET')
    assert.equal(calls.at(-2).init.headers['PayPal-Request-Id'], 'capture-TESTORDER123456789')
  })
  await test('pending capture never becomes a paid download', async () => {
    const pending = structuredClone(completed)
    pending.purchase_units[0].payments.captures[0].status = 'PENDING'
    replies = [{ body: pending }]
    const result = await paypal.inspectPaypalOrder('TESTORDER123456789')
    assert.equal(result.payment.paid, false)
    assert.equal(result.payment.captureStatus, 'PENDING')
    assert.equal(calls.at(-1).init.method, 'GET')
  })
  await test('wrong payee is rejected and invalid environment fails closed', async () => {
    assert.equal(paypal.paidToPayee({ payeeEmail: 'other@example.com' }), false)
    process.env.PAYPAL_ENV = 'typo'
    assert.throws(() => paypal.paypalConfigured(), /Invalid PayPal environment/)
  })
} finally {
  globalThis.fetch = originalFetch
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]
  Object.assign(process.env, saved)
  await rm(dir, { recursive: true, force: true })
}

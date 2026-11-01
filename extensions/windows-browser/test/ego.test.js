import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApprovalGate } from '../../computer-use/src/approval.js'
import { createEgoSession, createMockEgo } from '../src/ego.js'
import { connectPlaywright, windowsCdpTarget } from '../src/playwright.js'

function session(botId, runtime) {
  return createEgoSession({
    botId,
    runtime,
    gate: new ApprovalGate(async () => false),
    secrets: ['desk-token-value'],
  })
}

test('each Bot gets its own Task Space and tabs', async () => {
  const runtime = createMockEgo()
  const alpha = session('alpha', runtime)
  const beta = session('beta', runtime)
  await alpha.open('https://example.com/alpha')
  await beta.open('https://example.com/beta')
  const a = await alpha.tabs()
  const b = await beta.tabs()
  assert.equal(a.tabs.length, 1)
  assert.equal(b.tabs.length, 1)
  assert.equal(a.tabs[0].url, 'https://example.com/alpha')
  assert.equal(b.tabs[0].url, 'https://example.com/beta')
})

test('devtools captures network entries and redacts secrets', async () => {
  const alpha = session('alpha')
  const before = await alpha.network()
  assert.equal(before.capturing, false)
  const panel = await alpha.devtools()
  assert.equal(panel.panel, 'network')
  alpha.record({
    url: 'https://example.com/cb?token=abcdef',
    requestHeaders: { Authorization: 'Bearer short', Cookie: 'a=b' },
    responseHeaders: {},
    requestBody: { note: 'desk-token-value' },
    responseBody: 'ok',
  })
  const log = await alpha.network()
  assert.equal(log.capturing, true)
  assert.equal(log.entries[0].requestHeaders.Authorization, '[redacted]')
  assert.equal(log.entries[0].requestHeaders.Cookie, '[redacted]')
  assert.equal(log.entries[0].requestBody.note, '[redacted]')
  await assert.rejects(alpha.network({ raw: true }), /network\.raw/)
  await assert.rejects(alpha.cdp('Network.getCookies'), /cookies\.read/)
})

test('Playwright connects over CDP only as a fallback', async () => {
  assert.equal(windowsCdpTarget('http://127.0.0.1:9222').fallback, 'playwright')
  const browser = await connectPlaywright('http://127.0.0.1:9222', {
    load: async () => ({
      chromium: { async connectOverCDP(endpoint) { return { endpoint } } },
    }),
  })
  assert.equal(browser.endpoint, 'http://127.0.0.1:9222')
  await assert.rejects(
    connectPlaywright('http://127.0.0.1:9222', { load: async () => { throw new Error('missing') } }),
    /ego is the browser path/,
  )
})

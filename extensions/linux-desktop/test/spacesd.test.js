import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApprovalGate } from '../../computer-use/src/approval.js'
import { createDesktopBridge } from '../src/bridge.js'
import { createMockSpacesd } from '../src/mock-spacesd.js'
import { createSandboxDriver } from '../src/sandbox-fallback.js'
import { attachTrycua, createSpacesdClient } from '../src/spacesd-client.js'

const TOKEN = 'desk-token'

async function desk() {
  const mock = await createMockSpacesd({ token: TOKEN })
  const client = createSpacesdClient({ url: mock.url, token: TOKEN })
  const gate = new ApprovalGate(async () => false)
  const bridge = createDesktopBridge({ client, botIds: ['alpha', 'beta'], gate })
  return { mock, bridge }
}

test('screenshot, click and type stay on one Bot display', async () => {
  const { mock, bridge } = await desk()
  try {
    const shotA = await bridge.screenshot('alpha')
    const shotB = await bridge.screenshot('beta')
    assert.equal(shotA.displayId, 'bot:alpha')
    assert.equal(shotB.displayId, 'bot:beta')
    assert.notEqual(shotA.image, shotB.image)
    assert.equal(Buffer.from(shotA.image, 'base64')[0], 0x89)
    const log = await bridge.plan('alpha', 'click "Terminal" and type "echo hi"')
    assert.deepEqual(log.map(step => step.method), [
      'ComputerService/Pointer',
      'ComputerService/Keyboard',
      'ComputerService/Screenshot',
    ])
    const after = await bridge.tree('alpha')
    const other = await bridge.tree('beta')
    assert.equal(after.text, 'echo hi')
    assert.equal(other.text, '')
  } finally {
    await mock.close()
  }
})

test('clipboard reads are denied unless approved', async () => {
  const { mock, bridge } = await desk()
  try {
    await assert.rejects(bridge.clipboard('alpha'), /clipboard\.read/)
  } finally {
    await mock.close()
  }
})

test('a missing token is unauthenticated and a token is not put in the URL', async () => {
  const mock = await createMockSpacesd({ token: TOKEN })
  try {
    const client = createSpacesdClient({ url: mock.url, token: 'nope' })
    await assert.rejects(client.callJson('SystemService/GetCapabilities', {}), /unauthenticated/)
    assert.throws(
      () => createSpacesdClient({ url: `http://127.0.0.1:9/?${TOKEN}=1`, token: TOKEN }),
      /must not be placed in the URL/,
    )
  } finally {
    await mock.close()
  }
})

test('attachTrycua uses callJson and does not delete the sandbox', async () => {
  const seen = []
  const client = await attachTrycua({
    url: 'http://127.0.0.1:3211',
    token: TOKEN,
    load: async () => ({
      embedded() {
        return {
          sandboxes() {
            return {
              async connectUrl(url, token) {
                seen.push(['connect', url, token])
                return {
                  async spacesd() {
                    return {
                      async callJson(method, json) {
                        seen.push(['call', method, json])
                        return JSON.stringify({ method })
                      },
                    }
                  },
                }
              },
            }
          },
        }
      },
    }),
  })
  const reply = await client.callJson('WindowsService/ListWindows', { filter: { titleContains: 'harness' } })
  assert.equal(reply.method, 'WindowsService/ListWindows')
  assert.equal(seen[0][0], 'connect')
  assert.equal(seen[1][1], 'WindowsService/ListWindows')
  assert.equal(seen.some(row => row[0] === 'delete'), false)
})

test('the desktop-sandbox fallback is GET /screenshot and POST /action', async () => {
  const seen = []
  const driver = createSandboxDriver({
    baseUrl: 'http://127.0.0.1:9',
    fetchImpl: async (url, init) => {
      seen.push([String(url), init?.method ?? 'GET'])
      if (String(url).endsWith('/screenshot')) {
        return { ok: true, arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer }
      }
      return { ok: true, json: async () => ({ ok: true }) }
    },
  })
  const image = await driver.screenshot()
  await driver.action({ kind: 'click', x: 1, y: 2 })
  assert.equal(image.length, 3)
  assert.deepEqual(seen, [
    ['http://127.0.0.1:9/screenshot', 'GET'],
    ['http://127.0.0.1:9/action', 'POST'],
  ])
})

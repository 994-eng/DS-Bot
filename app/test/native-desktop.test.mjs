import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createNativeDesktop, mapFramePoint } from '../src/native-desktop.mjs'

function frame(message) {
  const head = Buffer.alloc(5)
  head.writeUInt32BE(message.length, 1)
  const trailer = Buffer.from('grpc-status: 0\r\n')
  const tail = Buffer.alloc(5)
  tail[0] = 0x80
  tail.writeUInt32BE(trailer.length, 1)
  return Buffer.concat([head, message, tail, trailer])
}

function bytesField(field, data) {
  return Buffer.concat([Buffer.from([field << 3 | 2, data.length]), data])
}

test('a click on the preview maps into the screenshot', () => {
  assert.deepEqual(mapFramePoint(10, 20, 100, 50, 200, 100), { x: 20, y: 40 })
  assert.equal(mapFramePoint(1, 1, 0, 10, 10, 10), null)
})

test('frames and input go to spacesd on port 3211 and the token stays out of the URL', async () => {
  const seen = []
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0, 0, 0, 4, 0, 0, 0, 2,
  ])
  const fetchImpl = async (url, init) => {
    seen.push({ url: String(url), auth: init.headers.authorization, type: init.headers['content-type'] })
    const id = Buffer.from('shot-1')
    const message = String(url).includes('Screenshot')
      ? Buffer.concat([bytesField(1, png), bytesField(7, id)])
      : Buffer.alloc(0)
    const bytes = frame(message)
    return { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }
  }
  const frames = []
  const desk = createNativeDesktop({
    env: { CUA_ENV_TOKEN: 'desk-token', DS_BOT_SPACESD_URL: 'http://38.76.188.71:3211' },
    fetchImpl,
    onFrame: (frame) => frames.push(frame),
    intervalMs: 10_000,
  })
  desk.start()
  await new Promise(resolve => setTimeout(resolve, 30))
  desk.stop()
  assert.equal(frames[0].state, 'frame')
  assert.equal(frames[0].width, 4)
  assert.equal(frames[0].height, 2)
  assert.equal(JSON.stringify(frames[0]).includes('desk-token'), false)
  assert.equal(seen[0].url, 'http://38.76.188.71:3211/cua.env.v1.ComputerService/Screenshot')
  assert.equal(seen[0].url.includes('8890'), false)
  assert.equal(seen[0].url.includes('ticket'), false)
  assert.equal(seen[0].url.includes('desk-token'), false)
  assert.equal(seen[0].auth, 'Bearer desk-token')
  assert.equal(await desk.pointer({ x: 2, y: 1, viewWidth: 4, viewHeight: 2 }), true)
  assert.equal(seen.some(call => call.url.endsWith('ComputerService/Pointer')), true)
  assert.equal(seen.every(call => !call.url.includes('8890') && !call.url.includes('desk-token')), true)
  assert.equal(await desk.type('a'), true)
  assert.equal(seen.some(call => call.url.endsWith('ComputerService/Keyboard')), true)
})

test('without a token the screen does not call spacesd', async () => {
  let called = false
  const frames = []
  const desk = createNativeDesktop({
    env: {},
    fetchImpl: async () => { called = true; throw new Error('should not fetch') },
    onFrame: (frame) => frames.push(frame),
    intervalMs: 10_000,
  })
  desk.start()
  await new Promise(resolve => setTimeout(resolve, 20))
  desk.stop()
  assert.equal(called, false)
  assert.equal(frames[0].state, 'needs-token')
})

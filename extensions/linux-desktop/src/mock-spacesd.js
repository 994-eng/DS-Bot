import { createServer } from 'node:http'
import { encodePng } from '../../computer-use/src/png.js'
import { decodeRequestBody, frameMessage } from './frames.js'

const WIDTH = 8
const HEIGHT = 8

function colorOf(displayId) {
  let hash = 0
  for (const char of displayId) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return [hash & 0xff, (hash >> 8) & 0xff, (hash >> 16) & 0xff]
}

function pngFor(color) {
  const rgb = Buffer.alloc(WIDTH * HEIGHT * 3)
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
    rgb[i * 3] = color[0]
    rgb[i * 3 + 1] = color[1]
    rgb[i * 3 + 2] = color[2]
  }
  return encodePng(WIDTH, HEIGHT, rgb)
}

function desktopNodes() {
  return {
    id: 'desktop',
    role: 'desktop',
    name: 'Desktop',
    bounds: { x: 0, y: 0, width: 1280, height: 800 },
    children: [
      {
        id: 'terminal',
        role: 'textField',
        name: 'Terminal',
        bounds: { x: 40, y: 40, width: 640, height: 400 },
        value: '',
      },
    ],
  }
}

function ensureDisplay(state, displayId) {
  const id = displayId || 'primary'
  let display = state.displays.get(id)
  if (!display) {
    display = {
      id,
      width: 1280,
      height: 800,
      color: colorOf(id),
      nodes: desktopNodes(),
      focused: null,
      clicks: [],
      text: '',
    }
    state.displays.set(id, display)
  }
  return display
}

function hitTerminal(display, position) {
  const node = display.nodes.children[0]
  const { x, y } = position ?? {}
  if (x === undefined || y === undefined) return null
  const box = node.bounds
  if (x < box.x || y < box.y || x >= box.x + box.width || y >= box.y + box.height) return null
  return node
}

function handle(state, method, body) {
  if (method === 'SystemService/GetCapabilities') {
    return {
      protocolVersion: 1,
      revision: 13,
      services: ['ComputerService', 'DriverService', 'WindowsService', 'AccessibilityService'],
    }
  }
  if (method === 'ComputerService/ListDisplays') {
    return {
      displays: [...state.displays.values()].map(display => ({
        id: display.id,
        width: display.width,
        height: display.height,
      })),
    }
  }
  const displayId = body.displayId || body.target?.displayId || 'primary'
  const display = ensureDisplay(state, displayId)
  if (method === 'ComputerService/Screenshot') {
    const png = pngFor(display.color)
    return {
      image: png.toString('base64'),
      format: 'IMAGE_FORMAT_PNG',
      imageSize: { width: WIDTH, height: HEIGHT },
      nativeSize: { width: display.width, height: display.height },
      scale: 1,
      logicalBounds: { x: 0, y: 0, width: display.width, height: display.height },
      screenshotId: `${display.id}:latest`,
      displayId: display.id,
    }
  }
  if (method === 'ComputerService/Pointer') {
    const position = body.click?.position ?? body.move?.position ?? null
    display.clicks.push(position)
    const node = hitTerminal(display, position)
    display.focused = node?.id ?? null
    return { report: { delivered: true, displayId: display.id, focused: display.focused } }
  }
  if (method === 'ComputerService/Keyboard') {
    const text = body.type?.text ?? ''
    if (display.focused) display.text += text
    return { report: { delivered: display.focused !== null, displayId: display.id, text: display.text } }
  }
  if (method === 'AccessibilityService/GetTree') {
    return { displayId: display.id, root: display.nodes, text: display.text }
  }
  if (method === 'WindowsService/ListWindows') {
    return {
      windows: [{
        id: `${display.id}:terminal`,
        title: 'Terminal',
        displayId: display.id,
        bounds: display.nodes.children[0].bounds,
      }],
    }
  }
  if (method === 'ComputerService/GetClipboard') {
    return { content: { text: display.clipboard ?? '' } }
  }
  if (method === 'DriverService/ListTools') {
    return { tools: [] }
  }
  const error = new Error(`Mock spacesd has no ${method}.`)
  error.status = 12
  throw error
}

function bearer(header) {
  const match = /^Bearer\s+(\S+)$/.exec(header ?? '')
  return match?.[1] ?? ''
}

function reply(res, status, message) {
  const body = Buffer.concat([
    frameMessage(0, JSON.stringify(message)),
    frameMessage(0x80, `grpc-status: ${status}\r\n`),
  ])
  res.writeHead(200, {
    'content-type': 'application/grpc-web+json',
    'content-length': body.length,
  })
  res.end(body)
}

// An in-process stand-in for cua-spacesd. It serves the documented paths on
// port 3211 when asked, with one framebuffer per display id.
export function createMockSpacesd({ token = '', host = '127.0.0.1', port = 0 } = {}) {
  const state = { displays: new Map() }
  ensureDisplay(state, 'primary')
  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (token && bearer(req.headers.authorization) !== token) {
        reply(res, 16, {})
        return
      }
      const match = /^\/cua\.env\.v1\.([^/]+)\/([^/?]+)/.exec(req.url ?? '')
      if (!match) {
        reply(res, 12, { message: 'Not a cua.env.v1 method.' })
        return
      }
      const method = `${match[1]}/${match[2]}`
      try {
        const body = decodeRequestBody(Buffer.concat(chunks))
        reply(res, 0, handle(state, method, body))
      } catch (error) {
        reply(res, error.status ?? 13, { message: error.message })
      }
    })
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      const address = server.address()
      resolve({
        url: `http://${host}:${address.port}`,
        state,
        close: () => new Promise((done, fail) => server.close(error => (error ? fail(error) : done()))),
      })
    })
  })
}

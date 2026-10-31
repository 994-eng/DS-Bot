// Minimal gRPC-Web protobuf calls for cua-spacesd. The root token is a header.
// A viewer ticket is the only credential that may appear in a URL, and only
// in the fragment, which is what CreateViewerTicket returns.
import { cloudConnection } from './cloud-backend.mjs'

function varint(value) {
  const bytes = []
  let rest = value >>> 0
  while (rest > 0x7f) {
    bytes.push((rest & 0x7f) | 0x80)
    rest >>>= 7
  }
  bytes.push(rest)
  return Buffer.from(bytes)
}

function tag(field, wire) {
  return varint((field << 3) | wire)
}

function protoBytes(field, data) {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data)
  return Buffer.concat([tag(field, 2), varint(body.length), body])
}

function protoVarint(field, value) {
  return Buffer.concat([tag(field, 0), varint(value)])
}

function protoDouble(field, value) {
  const body = Buffer.alloc(8)
  body.writeDoubleLE(value)
  return Buffer.concat([tag(field, 1), body])
}

function readVarint(buffer, offset) {
  let value = 0
  let shift = 0
  let pos = offset
  while (pos < buffer.length) {
    const byte = buffer[pos]
    pos += 1
    value += (byte & 0x7f) * (2 ** shift)
    if ((byte & 0x80) === 0) return { value, offset: pos }
    shift += 7
    if (shift > 28) break
  }
  throw new Error('truncated protobuf')
}

// Length-delimited fields, keyed by field number. Nested messages stay bytes.
export function protoFields(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const fields = {}
  let offset = 0
  while (offset < bytes.length) {
    const header = readVarint(bytes, offset)
    offset = header.offset
    const field = header.value >> 3
    const wire = header.value & 7
    if (wire === 2) {
      const length = readVarint(bytes, offset)
      offset = length.offset
      fields[field] = bytes.subarray(offset, offset + length.value)
      offset += length.value
    } else if (wire === 0) {
      const skipped = readVarint(bytes, offset)
      offset = skipped.offset
    } else if (wire === 1) offset += 8
    else if (wire === 5) offset += 4
    else break
  }
  return fields
}

export function decodeGrpcWeb(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  let message = Buffer.alloc(0)
  let status = 0
  let offset = 0
  while (offset + 5 <= bytes.length) {
    const flag = bytes[offset]
    const length = bytes.readUInt32BE(offset + 1)
    const start = offset + 5
    const end = start + length
    if (end > bytes.length) break
    const payload = bytes.subarray(start, end)
    if (flag & 0x80) {
      const match = /grpc-status:\s*(\d+)/.exec(payload.toString('utf8'))
      if (match) status = Number(match[1])
    } else message = payload
    offset = end
  }
  return { status, message }
}

export function methodPath(method) {
  const [service, rpc] = String(method).split('/')
  return `/cua.env.v1.${service}/${rpc}`
}

export async function grpcWeb({ base, method, token, body = Buffer.alloc(0), fetchImpl = globalThis.fetch }) {
  const endpoint = new URL(methodPath(method), base.endsWith('/') ? base : `${base}/`)
  if (token && endpoint.href.includes(token)) throw new Error('The env token must not be placed in the URL.')
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/grpc-web+proto',
      'x-grpc-web': '1',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body,
  })
  const decoded = decodeGrpcWeb(Buffer.from(await response.arrayBuffer()))
  if (decoded.status === 16) throw new Error(`spacesd refused ${method}.`)
  if (decoded.status !== 0) throw new Error(`spacesd ${method} failed (${decoded.status}).`)
  return protoFields(decoded.message)
}

export function viewerPage(spacesdUrl, ticket) {
  const path = ticket.viewerPath || ''
  if (path.startsWith('/')) return new URL(path, spacesdUrl).toString()
  const url = new URL('/viewer/', spacesdUrl)
  if (ticket.ticket) url.hash = `ticket=${ticket.ticket}`
  return url.toString()
}

export async function createViewerTicket({ base, token, fetchImpl }) {
  const fields = await grpcWeb({ base, method: 'SystemService/CreateViewerTicket', token, fetchImpl })
  return {
    ticket: fields[1] ? fields[1].toString('utf8') : '',
    viewerPath: fields[3] ? fields[3].toString('utf8') : '',
  }
}

function pngSize(bytes) {
  if (bytes.length < 24 || bytes[0] !== 0x89) return { width: 0, height: 0 }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

export async function captureDesktop({ base, token, fetchImpl }) {
  const body = Buffer.concat([protoVarint(4, 1), protoVarint(6, 1280), protoVarint(7, 1)])
  const fields = await grpcWeb({ base, method: 'ComputerService/Screenshot', token, body, fetchImpl })
  const image = fields[1] ?? Buffer.alloc(0)
  const size = pngSize(image)
  return {
    image: image.toString('base64'),
    screenshotId: fields[7] ? fields[7].toString('utf8') : '',
    width: size.width,
    height: size.height,
  }
}

export function pointerBody(x, y, screenshotId) {
  const point = Buffer.concat([protoDouble(1, x), protoDouble(2, y)])
  const click = Buffer.concat([protoBytes(1, point), protoVarint(2, 1), protoVarint(3, 1)])
  const target = Buffer.concat([protoVarint(4, 3), protoBytes(5, screenshotId)])
  return Buffer.concat([protoBytes(1, target), protoBytes(2, click)])
}

export function keyboardBody(text) {
  return protoBytes(2, protoBytes(1, text))
}

export async function desktopClick({ base, token, x, y, screenshotId, fetchImpl }) {
  await grpcWeb({
    base, method: 'ComputerService/Pointer', token, fetchImpl,
    body: pointerBody(x, y, screenshotId),
  })
}

export async function desktopType({ base, token, text, fetchImpl }) {
  await grpcWeb({
    base, method: 'ComputerService/Keyboard', token, fetchImpl,
    body: keyboardBody(text),
  })
}

export function spacesdBase(env = process.env) {
  return env.DS_BOT_SPACESD_URL || cloudConnection().spacesdUrl
}

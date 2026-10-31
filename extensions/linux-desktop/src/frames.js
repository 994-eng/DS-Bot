// Frames for the in-repo gRPC-Web JSON transport. Live cua-spacesd speaks
// protobuf on the same paths; attach with @trycua/cua callJson for that.

export const SPACESD_PORT = 3211

export function methodPath(method) {
  const [service, rpc] = String(method ?? '').split('/')
  if (!service || !rpc || service.includes('.') || rpc.includes('/')) {
    throw new Error('A spacesd method is Service/Rpc, for example ComputerService/Screenshot.')
  }
  return `/cua.env.v1.${service}/${rpc}`
}

export function frameMessage(flag, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  const head = Buffer.alloc(5)
  head[0] = flag
  head.writeUInt32BE(body.length, 1)
  return Buffer.concat([head, body])
}

export function decodeFrames(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const messages = []
  let status = 0
  let offset = 0
  while (offset + 5 <= bytes.length) {
    const flag = bytes[offset]
    const length = bytes.readUInt32BE(offset + 1)
    const start = offset + 5
    const end = start + length
    if (end > bytes.length) break
    const payload = bytes.subarray(start, end).toString('utf8')
    if (flag & 0x80) {
      const match = /grpc-status:\s*(\d+)/.exec(payload)
      if (match) status = Number(match[1])
    } else if (payload) {
      messages.push(JSON.parse(payload))
    }
    offset = end
  }
  return { status, message: messages[0] ?? {} }
}

export function decodeRequestBody(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  if (bytes.length === 0) return {}
  if (bytes[0] === 0x7b) return JSON.parse(bytes.toString('utf8'))
  const { message } = decodeFrames(bytes)
  return message
}

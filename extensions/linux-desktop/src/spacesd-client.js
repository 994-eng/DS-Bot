import { decodeFrames, frameMessage, methodPath } from './frames.js'

// The env token is a header, never part of the URL. A non-loopback spacesd
// refuses to run without one; losing it means losing the machine.
export function createSpacesdClient({ url, token = '', fetchImpl = globalThis.fetch } = {}) {
  if (!url) throw new Error('A spacesd URL is required.')
  if (token && String(url).includes(token)) throw new Error('The env token must not be placed in the URL.')
  const base = new URL(url)
  return {
    url: base.origin,
    async callJson(method, body = {}) {
      const endpoint = new URL(methodPath(method), base)
      if (token && endpoint.href.includes(token)) throw new Error('The env token must not be placed in the URL.')
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/grpc-web+json',
          'x-grpc-web': '1',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: frameMessage(0, JSON.stringify(body ?? {})),
      })
      if (!response.ok && response.status !== 200) {
        throw new Error(`spacesd ${method} failed with HTTP ${response.status}.`)
      }
      const decoded = decodeFrames(Buffer.from(await response.arrayBuffer()))
      if (decoded.status === 16) throw new Error(`spacesd refused ${method} (unauthenticated).`)
      if (decoded.status !== 0) throw new Error(decoded.message?.message || `spacesd ${method} failed (${decoded.status}).`)
      return decoded.message
    },
  }
}

// Live cua-spacesd speaks protobuf. @trycua/cua callJson is the supported
// JSON entry. Connecting does not create or delete a sandbox.
export async function attachTrycua({ url, token, load } = {}) {
  if (!url) throw new Error('A spacesd URL is required.')
  const importer = load ?? (() => import('@trycua/cua'))
  let cua
  try {
    cua = await importer()
  } catch (error) {
    const wrapped = new Error('Install @trycua/cua to attach to a live cua-spacesd. The mock transport does not need it.')
    wrapped.cause = error
    throw wrapped
  }
  const embedded = cua.embedded ?? cua.default?.embedded
  if (typeof embedded !== 'function') throw new Error('@trycua/cua did not export embedded().')
  const sandbox = await embedded().sandboxes().connectUrl(url, token)
  const env = await sandbox.spacesd()
  return {
    async callJson(method, body = {}) {
      const reply = await env.callJson(method, JSON.stringify(body ?? {}))
      return typeof reply === 'string' ? JSON.parse(reply) : reply
    },
  }
}

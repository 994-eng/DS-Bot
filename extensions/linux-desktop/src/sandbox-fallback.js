// Optional HTTP data plane from arthurkatcher/desktop-sandbox. Use it only when
// cua-spacesd is too heavy for a thin guest. It is not the primary API.

export function sandboxRequest(action) {
  if (!action || action.kind === 'screenshot') return { method: 'GET', path: '/screenshot' }
  return { method: 'POST', path: '/action', body: action }
}

export function createSandboxDriver({ baseUrl, fetchImpl = globalThis.fetch }) {
  const root = new URL(baseUrl)
  return {
    async screenshot() {
      const response = await fetchImpl(new URL('/screenshot', root))
      if (!response.ok) throw new Error(`desktop-sandbox screenshot failed with HTTP ${response.status}.`)
      return Buffer.from(await response.arrayBuffer())
    },
    async action(body) {
      const request = sandboxRequest(body)
      const response = await fetchImpl(new URL(request.path, root), {
        method: request.method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request.body),
      })
      if (!response.ok) throw new Error(`desktop-sandbox action failed with HTTP ${response.status}.`)
      return response.json()
    },
  }
}

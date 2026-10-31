import { classifyCdp } from '../../computer-use/src/approval.js'
import { redactEntry, redactJson } from '../../computer-use/src/redact.js'

// In-memory stand-in for globalThis.ego. Each Task Space has its own tabs.
export function createMockEgo() {
  const spaces = []
  const tabs = new Map()
  const cdp = new Map()
  let next = 1
  let current = null
  const requireSpace = () => {
    if (current === null || !tabs.has(current)) throw new Error('Select a Task Space first.')
    return current
  }
  return {
    async listTaskSpaces() {
      return { taskSpaces: spaces.map(space => ({ ...space })) }
    },
    async createTaskSpace(name) {
      if (!name) throw new TypeError('A Task Space name is required.')
      const space = { id: next, taskId: name, name, ownership: 'agent' }
      next += 1
      spaces.push(space)
      tabs.set(space.id, [])
      cdp.set(space.id, [])
      return { id: space.id, taskId: name, name }
    },
    async useTaskSpace(id) {
      if (!tabs.has(id)) throw new Error('No Task Space with that id.')
      current = id
    },
    async createTab(url) {
      const id = requireSpace()
      const list = tabs.get(id)
      for (const tab of list) tab.active = false
      const targetId = `tab-${id}-${list.length + 1}`
      list.push({ index: list.length, targetId, url, title: url, active: true })
      return { targetId }
    },
    async listTabs() {
      return { tabs: (tabs.get(requireSpace()) ?? []).map(tab => ({ ...tab })) }
    },
    async snapshot() {
      const list = tabs.get(requireSpace()) ?? []
      const active = list.find(tab => tab.active)
      return { url: active?.url ?? '', title: active?.title ?? '', text: active?.title ?? '' }
    },
    async sendCDPMessage(payload) {
      const id = requireSpace()
      cdp.get(id).push(payload)
      if (payload.method === 'Network.getResponseBody') {
        return { result: { body: payload.params?.body ?? '', base64Encoded: false } }
      }
      return { result: {} }
    },
  }
}

export function createCapture() {
  const entries = []
  return {
    enabled: false,
    enable() {
      this.enabled = true
    },
    push(entry) {
      if (!this.enabled) return
      entries.push(entry)
    },
    list() {
      return entries.map(entry => ({ ...entry }))
    },
  }
}

export function createEgoSession({ botId, runtime, gate, secrets = [] }) {
  const ego = runtime ?? createMockEgo()
  const capture = createCapture()
  let spaceId = null

  async function space() {
    if (spaceId === null) {
      const created = await ego.createTaskSpace(`bot:${botId}`)
      spaceId = created.id
    }
    // One ego process, many Task Spaces. Re-select before each call so two
    // Bots sharing the runtime do not type into each other's tabs.
    await ego.useTaskSpace(spaceId)
    return spaceId
  }

  return {
    botId,
    async open(url) {
      await space()
      return ego.createTab(url)
    },
    async snapshot() {
      await space()
      return ego.snapshot()
    },
    async tabs() {
      await space()
      return ego.listTabs()
    },
    // F12 opens DevTools for a person. The agent enables the Network domain
    // on this Bot's Task Space and records what arrives after that.
    async devtools() {
      await space()
      capture.enable()
      await ego.sendCDPMessage({ method: 'Network.enable', params: {} })
      await ego.sendCDPMessage({
        method: 'Input.dispatchKeyEvent',
        params: { type: 'keyDown', key: 'F12', windowsVirtualKeyCode: 123 },
      })
      return { open: true, panel: 'network' }
    },
    record(entry) {
      capture.push(entry)
    },
    async network({ raw = false } = {}) {
      if (raw) await gate.allow(classifyCdp('Network.enable', { raw: true }))
      if (!capture.enabled) return { capturing: false, entries: [] }
      const entries = capture.list().map(entry => (raw ? entry : redactEntry(entry, secrets)))
      return { capturing: true, entries }
    },
    async cdp(method, params = {}, options = {}) {
      await space()
      await gate.allow(classifyCdp(method, options))
      const reply = await ego.sendCDPMessage({ method, params })
      if (options.raw) return reply
      return redactJson(reply, secrets)
    },
  }
}

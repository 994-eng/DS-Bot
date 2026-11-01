import { classifySpacesd } from '../../computer-use/src/approval.js'
import { planDesktopGoal } from '../../computer-use/src/plan.js'

export function displayIdFor(botId) {
  return `bot:${botId}`
}

export function createScreenRouter({ client, botIds }) {
  const displays = new Map(botIds.map(botId => [botId, displayIdFor(botId)]))

  function displayId(botId) {
    const id = displays.get(botId)
    if (!id) throw new Error(`No screen for ${botId}.`)
    return id
  }

  function stamp(botId, method, body) {
    const id = displayId(botId)
    if (method === 'ComputerService/Screenshot' || method === 'AccessibilityService/GetTree') {
      return { ...body, displayId: id }
    }
    if (method.startsWith('ComputerService/')) {
      return {
        ...body,
        target: {
          ...(body.target ?? {}),
          displayId: id,
          space: body.target?.space ?? 'COORDINATE_SPACE_SCREEN',
        },
      }
    }
    return { ...body, displayId: id }
  }

  return {
    displayId,
    call(botId, method, body = {}) {
      return client.callJson(method, stamp(botId, method, body))
    },
    screenshot(botId) {
      return this.call(botId, 'ComputerService/Screenshot', { format: 'IMAGE_FORMAT_PNG' })
    },
    pointer(botId, position) {
      return this.call(botId, 'ComputerService/Pointer', {
        click: { position, button: 'MOUSE_BUTTON_LEFT', count: 1 },
      })
    },
    keyboard(botId, text) {
      return this.call(botId, 'ComputerService/Keyboard', { type: { text } })
    },
    tree(botId) {
      return this.call(botId, 'AccessibilityService/GetTree', {})
    },
  }
}

// What a future ds-bot tool would call. Registration stays in the plugin,
// through the public tool API, once a spacesd URL is configured. This function
// does not start a server and does not speak MCP stdio.
export function createDesktopBridge({ client, botIds, gate }) {
  const router = createScreenRouter({ client, botIds })
  return {
    router,
    screenshot: botId => router.screenshot(botId),
    click: (botId, position) => router.pointer(botId, position),
    type: (botId, text) => router.keyboard(botId, text),
    tree: botId => router.tree(botId),
    async clipboard(botId) {
      await gate.allow(classifySpacesd('ComputerService/GetClipboard'))
      return router.call(botId, 'ComputerService/GetClipboard', {})
    },
    async plan(botId, goal) {
      const tree = await router.tree(botId)
      const steps = planDesktopGoal(goal, tree.root)
      if (steps[0]?.error) throw new Error(steps[0].error)
      const log = []
      for (const step of steps) {
        await gate.allow(classifySpacesd(step.method))
        const result = await router.call(botId, step.method, step.body)
        log.push({ method: step.method, why: step.why, result })
      }
      return log
    },
  }
}

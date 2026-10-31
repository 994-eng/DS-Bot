// Per-Bot framebuffers on one machine. Callers receive copies, so a paint on
// one screen cannot change another through a shared buffer.

export function createVirtualScreenHost({ machineId = 'shared', sharedRoot = '/data', width = 8, height = 8 } = {}) {
  const screens = new Map()

  function open(botId) {
    let screen = screens.get(botId)
    if (!screen) {
      screen = {
        botId,
        screenId: `screen:${botId}`,
        displayId: `bot:${botId}`,
        width,
        height,
        buffer: Buffer.alloc(width * height * 3),
        events: [],
      }
      screens.set(botId, screen)
    }
    return describe(screen)
  }

  function describe(screen) {
    return {
      botId: screen.botId,
      screenId: screen.screenId,
      displayId: screen.displayId,
      width: screen.width,
      height: screen.height,
    }
  }

  function screenOf(botId) {
    const screen = screens.get(botId)
    if (!screen) throw new Error(`No screen for ${botId}.`)
    return screen
  }

  return {
    machineId,
    sharedRoot,
    open,
    list() {
      return [...screens.values()].map(describe)
    },
    input(botId, event) {
      const screen = screenOf(botId)
      screen.events.push({ ...event })
      const x = event.x ?? 0
      const y = event.y ?? 0
      if (x >= 0 && y >= 0 && x < screen.width && y < screen.height) {
        const index = (y * screen.width + x) * 3
        screen.buffer[index] = event.r ?? 255
        screen.buffer[index + 1] = event.g ?? 255
        screen.buffer[index + 2] = event.b ?? 255
      }
      return describe(screen)
    },
    frame(botId) {
      return Buffer.from(screenOf(botId).buffer)
    },
  }
}

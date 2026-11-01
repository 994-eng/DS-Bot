// One shared machine, one screen record per Bot. Events never move between
// screens. The desktop host owns the pixels; this is the panel's model.

export function screenIdFor(botId) {
  return `screen:${botId}`
}

// The desktop app draws spacesd frames on a canvas. It does not load a viewer page.
export function embeddedScreen() {
  const screen = globalThis.dsBotApp?.screen
  return typeof screen?.subscribe === 'function' ? screen : null
}

export function requestLiveDesktop(desktop, bot) {
  if (embeddedScreen()) return true
  if (typeof desktop?.open !== 'function') return false
  void desktop.open({ botId: bot?.id ?? '', title: bot?.name ?? '' })
  return true
}

export function screenRail(bots, selectedId) {
  const items = bots.map(bot => ({
    id: bot.id ?? bot.botId,
    name: bot.name,
    screenId: screenIdFor(bot.id ?? bot.botId),
  }))
  const selected = items.some(item => item.id === selectedId) ? selectedId : (items[0]?.id ?? null)
  return {
    selectedId: selected,
    items: items.map(item => ({ ...item, selected: item.id === selected })),
  }
}

export function createScreenDesk(bots, { machineId = 'shared' } = {}) {
  const screens = new Map()
  for (const bot of bots) {
    screens.set(bot.id, {
      botId: bot.id,
      name: bot.name,
      screenId: screenIdFor(bot.id),
      events: [],
      status: 'idle',
    })
  }
  const view = (screen) => ({
    botId: screen.botId,
    name: screen.name,
    screenId: screen.screenId,
    status: screen.status,
    events: screen.events.map(event => ({ ...event })),
  })
  return {
    machineId,
    shared: true,
    list() {
      return [...screens.values()].map(view)
    },
    rail(selectedId) {
      return screenRail([...screens.values()].map(screen => ({ id: screen.botId, name: screen.name })), selectedId)
    },
    input(botId, event) {
      const screen = screens.get(botId)
      if (!screen) throw new Error(`No screen for ${botId}.`)
      screen.events.push({ ...event })
      screen.status = 'active'
      return view(screen)
    },
  }
}

export const VIRTUAL_SCREEN_CSS = `
.bt-screen-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;height:44px;padding:0 12px;flex:none;border-bottom:.5px solid var(--bt-line);font-size:12.5px;color:var(--bt-ink)}
.bt-screen-back{border:0;background:var(--bt-hover);color:var(--bt-ink);border-radius:8px;height:28px;padding:0 10px;font:inherit;font-size:12px;cursor:pointer}
.bt-screen-back:hover{background:var(--bt-active)}
.bt-screen-tabs{display:flex;gap:14px;padding:10px 16px 0;flex:none}
.bt-screen-tabs button{border:0;background:none;color:var(--bt-ink-3);font:inherit;font-size:13px;padding:0 0 8px;cursor:pointer}
.bt-screen-tabs button[aria-selected=true]{color:var(--bt-ink);box-shadow:inset 0 -2px 0 var(--bt-ink)}
.bt-screen-zoom{display:flex;gap:6px;align-items:center}
.bt-screen-card{margin:16px;width:min(100%,280px);border:1px solid var(--bt-line);border-radius:12px;overflow:hidden;background:var(--bt-card)}
.bt-screen-thumb{display:block;width:100%;height:158px;border:0;padding:0;background:#111;cursor:pointer;object-fit:contain}
.bt-screen-cap{padding:8px 10px;font-size:12px;color:var(--bt-ink-2)}
.bt-screen-overlay{position:fixed;left:24px;right:24px;bottom:24px;top:48px;z-index:70;display:flex;flex-direction:column;background:#111;border-radius:12px;overflow:hidden}
.bt-screen-stage{flex:1;min-height:360px;width:100%;background:#111}
.bt-screen-empty{color:var(--bt-ink-2);font-size:13px;max-width:260px}
.bt-screen-empty strong{display:block;color:var(--bt-ink);font-size:15px;font-weight:600;margin-bottom:6px}
.bt-screen-note{color:var(--bt-ink-3);font-size:12px}
`

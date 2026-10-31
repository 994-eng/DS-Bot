// The Screen panel's live desktop. The Cua page is a WebContentsView laid over
// the panel, not an iframe: the viewer refuses to be framed. The page is the
// ticket redirect, so this client does not mint a ticket and does not put a
// token in the address. Zoom scales the view. Pointer and keyboard go to the
// view itself once it is clicked.
import { DESKTOP_PAGE } from './desktop-viewer.mjs'
import { cloudConnection } from './cloud-backend.mjs'

export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function clampZoom(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 1
  return Math.min(2, Math.max(0.5, Math.round(number * 100) / 100))
}

export function stepZoom(current, direction) {
  const zoom = clampZoom(current)
  const next = ZOOM_STEPS.filter(step => (direction < 0 ? step < zoom - 0.01 : step > zoom + 0.01))
  if (direction < 0) return next.at(-1) ?? ZOOM_STEPS[0]
  return next[0] ?? ZOOM_STEPS.at(-1)
}

export function desktopPage(env = process.env) {
  const raw = env.DS_BOT_DESKTOP_URL || DESKTOP_PAGE
  const url = new URL(raw)
  url.username = ''
  url.password = ''
  for (const name of ['token', 'access_token', 'auth']) url.searchParams.delete(name)
  return url.toString()
}

// The view may follow the ticket redirect onto the spacesd viewer. It may not
// leave those two ports.
export function desktopNavigationAllowed(target, page = DESKTOP_PAGE) {
  try {
    const next = new URL(target)
    const home = new URL(page)
    const spaces = new URL(cloudConnection().spacesdUrl)
    if (next.protocol !== 'http:' && next.protocol !== 'https:') return false
    if (next.hostname !== home.hostname && next.hostname !== spaces.hostname) return false
    return next.port === home.port || next.port === spaces.port
  } catch {
    return false
  }
}

export function isDesktopEntry(target, page = DESKTOP_PAGE) {
  try {
    const next = new URL(target)
    const home = new URL(page)
    return next.origin === home.origin && next.pathname.startsWith('/desktop')
  } catch {
    return false
  }
}

export function isViewerTicket(target) {
  try {
    const next = new URL(target)
    return next.pathname.startsWith('/viewer') && (next.searchParams.has('ticket') || next.hash.includes('ticket='))
  } catch {
    return false
  }
}

// `allow` keeps the load. `refresh` means the ticket page must be loaded again
// so a stale `/viewer/?ticket=` is not reused. `block` leaves this host.
export function navigationDecision(target, { expectViewer = false, page = DESKTOP_PAGE } = {}) {
  if (!desktopNavigationAllowed(target, page)) return 'block'
  if (isDesktopEntry(target, page)) return 'allow'
  if (isViewerTicket(target)) return expectViewer ? 'allow' : 'refresh'
  return 'allow'
}

export function pageSaysExpired(text) {
  return /expired|not valid|reconnect|已过期|无效/iu.test(String(text ?? ''))
}

export const TICKET_REFRESH_MS = 12 * 60 * 1000

function rectOf(rect) {
  const width = Math.round(Number(rect?.width) || 0)
  const height = Math.round(Number(rect?.height) || 0)
  if (width < 8 || height < 8) return undefined
  return {
    x: Math.max(0, Math.round(Number(rect?.left ?? rect?.x) || 0)),
    y: Math.max(0, Math.round(Number(rect?.top ?? rect?.y) || 0)),
    width,
    height,
  }
}

export function createScreenPanel({ WebContentsView, getWindow, env = process.env, onStatus = () => {}, now = () => Date.now() } = {}) {
  let view
  let parent
  let zoom = 1
  let loaded = false
  let expectViewer = false
  let refreshing = false
  let loadedAt = 0
  let timer
  const page = desktopPage(env)

  function contents() {
    return view?.webContents
  }

  function loadFresh() {
    const web = contents()
    if (!web) return false
    expectViewer = true
    refreshing = true
    loaded = true
    loadedAt = now()
    onStatus({ state: 'refreshing', page })
    void web.loadURL(page)
    return true
  }

  async function noteLoad() {
    const web = contents()
    expectViewer = false
    let text = ''
    try { text = await web?.executeJavaScript?.('document.body ? document.body.innerText.slice(0, 800) : ""', true) } catch { text = '' }
    if (pageSaysExpired(text)) {
      if (refreshing) {
        refreshing = false
        onStatus({ state: 'expired', page })
        return
      }
      loadFresh()
      return
    }
    refreshing = false
    onStatus({ state: 'live', page })
  }

  function onNavigate(event, target) {
    const decision = navigationDecision(target, { expectViewer, page })
    if (decision === 'allow') return
    event.preventDefault()
    if (decision === 'refresh') loadFresh()
  }

  function ensure(window) {
    if (!WebContentsView || !window?.contentView) return false
    if (view && parent !== window) {
      try { parent.contentView.removeChildView(view) } catch { /* the old window is gone */ }
      view = undefined
      parent = undefined
      loaded = false
    }
    if (!view) {
      view = new WebContentsView({
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webviewTag: false },
      })
      window.contentView.addChildView(view)
      parent = window
      const web = contents()
      web?.on?.('will-navigate', onNavigate)
      web?.on?.('will-redirect', onNavigate)
      web?.on?.('did-finish-load', () => { void noteLoad() })
      web?.setWindowOpenHandler?.(() => ({ action: 'deny' }))
    }
    return true
  }

  function watch() {
    clearInterval(timer)
    timer = setInterval(() => {
      if (!view?.visible && view?.isVisible?.() !== true) return
      if (now() - loadedAt >= TICKET_REFRESH_MS) loadFresh()
      else void noteLoad()
    }, 8000)
  }

  return {
    page,
    place(rect) {
      const bounds = rectOf(rect)
      const window = getWindow?.()
      if (!bounds || !ensure(window)) return { mode: 'unavailable', zoom, page }
      view.setBounds(bounds)
      view.visible = true
      view.setVisible(true)
      contents()?.setZoomFactor?.(zoom)
      watch()
      if (!loaded) loadFresh()
      return { mode: 'viewer', zoom, page }
    },
    hide() {
      if (view) view.visible = false
      view?.setVisible?.(false)
      clearInterval(timer)
      timer = undefined
    },
    zoomBy(direction) {
      zoom = stepZoom(zoom, direction)
      contents()?.setZoomFactor?.(zoom)
      return zoom
    },
    reload() {
      return loadFresh()
    },
  }
}

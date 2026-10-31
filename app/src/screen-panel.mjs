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

export function createScreenPanel({ WebContentsView, getWindow, env = process.env } = {}) {
  let view
  let parent
  let zoom = 1
  let loaded = false
  const page = desktopPage(env)

  function contents() {
    return view?.webContents
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
      web?.on?.('will-navigate', (event, target) => {
        if (!desktopNavigationAllowed(target, page)) event.preventDefault()
      })
      web?.setWindowOpenHandler?.(() => ({ action: 'deny' }))
    }
    return true
  }

  return {
    page,
    place(rect) {
      const bounds = rectOf(rect)
      const window = getWindow?.()
      if (!bounds || !ensure(window)) return { mode: 'unavailable', zoom, page }
      view.setBounds(bounds)
      view.setVisible(true)
      contents()?.setZoomFactor?.(zoom)
      if (!loaded) {
        loaded = true
        void contents().loadURL(page)
      }
      return { mode: 'viewer', zoom, page }
    },
    hide() {
      view?.setVisible?.(false)
    },
    zoomBy(direction) {
      zoom = stepZoom(zoom, direction)
      contents()?.setZoomFactor?.(zoom)
      return zoom
    },
    reload() {
      if (!contents()) return false
      loaded = true
      void contents().loadURL(page)
      return true
    },
  }
}

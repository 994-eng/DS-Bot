// The Cua viewer sends `frame-ancestors 'none'`, so the desktop page cannot sit
// in an iframe inside the Bot panel. A top-level BrowserWindow is the page
// itself, which that policy does not block. The env token, when set, is a
// request header only and never part of the URL.
import { readFileSync } from 'node:fs'
import { cloudConnection } from './cloud-backend.mjs'

export function readDesktopToken(env = process.env, read = readFileSync) {
  const fromEnv = typeof env.CUA_ENV_TOKEN === 'string' ? env.CUA_ENV_TOKEN.trim() : ''
  if (fromEnv !== '') return fromEnv
  const file = typeof env.CUA_ENV_TOKEN_FILE === 'string' ? env.CUA_ENV_TOKEN_FILE.trim() : ''
  if (file === '') return ''
  try {
    return String(read(file, 'utf8')).trim()
  } catch {
    return ''
  }
}

// The live desktop URL. Query credentials are stripped so a token cannot ride
// along in the address.
export function viewerTarget(env = process.env) {
  const connection = cloudConnection()
  const raw = env.DS_BOT_VIEWER_URL || connection.viewerUrl
  const url = new URL(raw)
  url.username = ''
  url.password = ''
  for (const name of ['token', 'access_token', 'auth']) url.searchParams.delete(name)
  return {
    url: url.toString(),
    origin: url.origin,
    spacesdUrl: env.DS_BOT_SPACESD_URL || connection.spacesdUrl,
  }
}

function attachToken(win, token, origin) {
  if (!token || typeof win.webContents?.session?.webRequest?.onBeforeSendHeaders !== 'function') return
  win.webContents.session.webRequest.onBeforeSendHeaders({ urls: [`${origin}/*`] }, (details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, authorization: `Bearer ${token}` } })
  })
}

export function createDesktopViewer({ BrowserWindow, getParent, env = process.env, readToken = readDesktopToken } = {}) {
  let win
  let loaded = ''
  return {
    open({ title = '' } = {}) {
      const target = viewerTarget(env)
      const label = title ? `${title}` : 'Desktop'
      if (win && !win.isDestroyed()) {
        if (typeof win.setTitle === 'function') win.setTitle(label)
        win.focus()
        return { url: loaded || target.url, reused: true }
      }
      win = new BrowserWindow({
        parent: getParent?.() ?? undefined,
        width: 1280,
        height: 800,
        title: label,
        autoHideMenuBar: true,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      })
      win.on?.('closed', () => { win = undefined; loaded = '' })
      attachToken(win, readToken(env), target.origin)
      loaded = target.url
      void win.loadURL(target.url)
      return { url: target.url, reused: false }
    },
  }
}

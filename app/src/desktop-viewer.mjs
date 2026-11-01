// The Screen panel opens the shared desktop in its own window. The page is not
// iframed. No token is put in the address.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { cloudConnection } from './cloud-backend.mjs'

export const DESKTOP_PAGE = 'http://38.76.188.71:8890/desktop'

// electron-builder puts extraResources next to app.asar: NSIS installs that as
// <app>\resources, and the portable zip has the same resources folder beside the exe.
export function packedCredentialPaths({
  resourcesPath = process.resourcesPath,
  execPath = process.execPath,
  appPath,
  extra,
} = {}) {
  const paths = []
  const add = (value) => {
    if (typeof value === 'string' && value !== '' && !paths.includes(value)) paths.push(value)
  }
  if (typeof extra === 'string') add(extra.trim())
  if (typeof resourcesPath === 'string' && resourcesPath !== '') add(join(resourcesPath, 'mimo-credentials.json'))
  if (typeof execPath === 'string' && execPath !== '') add(join(dirname(execPath), 'resources', 'mimo-credentials.json'))
  if (typeof appPath === 'string' && appPath !== '') add(join(dirname(appPath), 'mimo-credentials.json'))
  return paths
}

function tokenFromPacked(text) {
  const parsed = JSON.parse(String(text).replace(/^\uFEFF/, ''))
  return typeof parsed?.CUA_ENV_TOKEN === 'string' ? parsed.CUA_ENV_TOKEN.trim() : ''
}

export function readDesktopToken(env = process.env, read = readFileSync, locations) {
  const fromEnv = typeof env.CUA_ENV_TOKEN === 'string' ? env.CUA_ENV_TOKEN.trim() : ''
  if (fromEnv !== '') return fromEnv
  const file = typeof env.CUA_ENV_TOKEN_FILE === 'string' ? env.CUA_ENV_TOKEN_FILE.trim() : ''
  if (file !== '') {
    try {
      const text = String(read(file, 'utf8')).trim()
      if (text !== '') return text
    } catch { /* a missing override file falls through to the packed credentials */ }
  }
  const named = typeof env.CUA_PACKED_CREDENTIALS === 'string' ? env.CUA_PACKED_CREDENTIALS.trim() : ''
  for (const path of packedCredentialPaths({ ...locations, extra: named })) {
    try {
      const token = tokenFromPacked(read(path, 'utf8'))
      if (token !== '') return token
    } catch { /* try the next place electron-builder may have put the file */ }
  }
  return ''
}

// The live desktop URL. Query credentials are stripped so a token cannot ride
// along in the address.
export function viewerTarget(env = process.env) {
  const connection = cloudConnection()
  const raw = env.DS_BOT_DESKTOP_URL || DESKTOP_PAGE
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

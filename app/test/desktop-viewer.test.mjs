import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createDesktopViewer, readDesktopToken, viewerTarget } from '../src/desktop-viewer.mjs'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../src')

function fakeBrowserWindow() {
  const made = []
  function BrowserWindow(options) {
    const record = {
      options,
      url: '',
      title: options.title,
      focused: false,
      destroyed: false,
      handlers: [],
      isDestroyed() { return this.destroyed },
      loadURL(url) { this.url = url; return Promise.resolve() },
      setTitle(title) { this.title = title },
      focus() { this.focused = true },
      on(event, fn) { if (event === 'closed') this.closed = fn },
      webContents: {
        session: {
          webRequest: {
            onBeforeSendHeaders(filter, handler) { record.handlers.push({ filter, handler }) },
          },
        },
      },
    }
    made.push(record)
    return record
  }
  return { BrowserWindow, made }
}

test('the Screen window loads the cloud viewer and not an iframe URL with a token', () => {
  const target = viewerTarget({
    DS_BOT_VIEWER_URL: 'http://user:desk-token@38.76.188.71:3211/viewer/?token=desk-token',
    CUA_ENV_TOKEN: 'desk-token',
  })
  assert.equal(target.url, 'http://38.76.188.71:3211/viewer/')
  assert.equal(target.url.includes('desk-token'), false)
  assert.equal(target.spacesdUrl, 'http://38.76.188.71:3211')
  const { BrowserWindow, made } = fakeBrowserWindow()
  const viewer = createDesktopViewer({
    BrowserWindow,
    env: { CUA_ENV_TOKEN: 'desk-token' },
  })
  const opened = viewer.open({ title: 'Chief' })
  assert.equal(opened.reused, false)
  assert.equal(opened.url, 'http://38.76.188.71:3211/viewer/')
  assert.equal(made[0].url, 'http://38.76.188.71:3211/viewer/')
  assert.equal(made[0].url.includes('desk-token'), false)
  assert.equal(made[0].options.webPreferences.nodeIntegration, false)
  const again = viewer.open({ title: 'Writer' })
  assert.equal(again.reused, true)
  assert.equal(made.length, 1)
  assert.equal(made[0].title, 'Writer')
  assert.equal(made[0].handlers.length, 1)
  assert.deepEqual(made[0].handlers[0].filter.urls, ['http://38.76.188.71:3211/*'])
})

test('a missing token does not invent one, and source does not store one', () => {
  assert.equal(readDesktopToken({}), '')
  assert.equal(readDesktopToken({ CUA_ENV_TOKEN_FILE: '/no/such/token-file' }), '')
  assert.equal(readDesktopToken({ CUA_ENV_TOKEN_FILE: '/tmp/x' }, () => 'from-file\n'), 'from-file')
  const text = ['cloud-backend.mjs', 'desktop-viewer.mjs', 'main.mjs'].map(name => readFileSync(join(SRC, name), 'utf8')).join('\n')
  assert.equal(text.includes('38.76.188.71'), true)
  assert.equal(/CUA_ENV_TOKEN\s*[:=]\s*['"][^'"]+['"]/u.test(text), false)
})

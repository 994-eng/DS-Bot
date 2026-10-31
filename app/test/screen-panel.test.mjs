import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createScreenPanel, desktopNavigationAllowed, desktopPage, navigationDecision, pageSaysExpired, stepZoom } from '../src/screen-panel.mjs'

function fakeView() {
  const views = []
  class WebContentsView {
    constructor(options) {
      this.options = options
      this.bounds = null
      this.visible = false
      this.webContents = {
        url: '',
        zoom: 1,
        setZoomFactor(value) { this.zoom = value },
        loadURL(url) { this.url = url; return Promise.resolve() },
        on() {},
        setWindowOpenHandler() {},
      }
      views.push(this)
    }
    setBounds(bounds) { this.bounds = bounds }
    setVisible(visible) { this.visible = visible }
  }
  const window = { contentView: { addChildView(view) { this.child = view }, removeChildView() {} } }
  return { WebContentsView, views, window }
}

test('zoom stays in range and the desktop URL carries no token', () => {
  assert.equal(stepZoom(1, 1), 1.25)
  assert.equal(stepZoom(1, -1), 0.75)
  assert.equal(stepZoom(2, 1), 2)
  assert.equal(stepZoom(0.5, -1), 0.5)
  const page = desktopPage({
    DS_BOT_DESKTOP_URL: 'http://user:desk-token@38.76.188.71:8890/desktop?token=desk-token',
    CUA_ENV_TOKEN: 'desk-token',
  })
  assert.equal(page, 'http://38.76.188.71:8890/desktop')
  assert.equal(desktopNavigationAllowed('http://38.76.188.71:3211/viewer/?ticket=short'), true)
  assert.equal(desktopNavigationAllowed('https://example.com/'), false)
})

test('the panel covers the stage with the desktop page and can zoom', () => {
  const { WebContentsView, views, window } = fakeView()
  const panel = createScreenPanel({
    WebContentsView,
    getWindow: () => window,
    env: { CUA_ENV_TOKEN: 'desk-token' },
  })
  assert.equal(panel.place({ width: 2, height: 2 }).mode, 'unavailable')
  const shown = panel.place({ left: 12, top: 40, width: 400, height: 300 })
  assert.equal(shown.mode, 'viewer')
  assert.equal(shown.page, 'http://38.76.188.71:8890/desktop')
  assert.equal(views[0].webContents.url, 'http://38.76.188.71:8890/desktop')
  assert.equal(views[0].webContents.url.includes('desk-token'), false)
  assert.equal(views[0].visible, true)
  assert.deepEqual(views[0].bounds, { x: 12, y: 40, width: 400, height: 300 })
  assert.equal(views[0].options.webPreferences.nodeIntegration, false)
  assert.equal(panel.zoomBy(1), 1.25)
  assert.equal(views[0].webContents.zoom, 1.25)
  panel.hide()
  assert.equal(views[0].visible, false)
  panel.reload()
  assert.equal(views[0].webContents.url, 'http://38.76.188.71:8890/desktop')
})

test('an expired viewer ticket reloads the desktop page instead of the old ticket', async () => {
  const page = 'http://38.76.188.71:8890/desktop'
  const stale = 'http://38.76.188.71:3211/viewer/?ticket=old'
  assert.equal(navigationDecision(page, { expectViewer: false }), 'allow')
  assert.equal(navigationDecision(stale, { expectViewer: true }), 'allow')
  assert.equal(navigationDecision(stale, { expectViewer: false }), 'refresh')
  assert.equal(pageSaysExpired('This viewer link has expired or is not valid.\nReconnect'), true)
  assert.equal(pageSaysExpired('Ubuntu desktop'), false)
  const handlers = {}
  let body = 'Ubuntu desktop'
  const statuses = []
  const made = []
  class WebContentsView {
    constructor() {
      this.bounds = null
      this.visible = false
      this.webContents = {
        url: '',
        loadURL(url) { this.url = url; return Promise.resolve() },
        executeJavaScript: async () => body,
        on(name, fn) { (handlers[name] ??= []).push(fn) },
        setZoomFactor() {},
        setWindowOpenHandler() {},
      }
      made.push(this)
    }
    setBounds(bounds) { this.bounds = bounds }
    setVisible(visible) { this.visible = visible }
  }
  const window = { contentView: { addChildView() {}, removeChildView() {} } }
  const panel = createScreenPanel({
    WebContentsView,
    getWindow: () => window,
    onStatus: (status) => statuses.push(status.state),
  })
  panel.place({ left: 0, top: 80, width: 240, height: 140 })
  const web = made[0].webContents
  assert.equal(web.url, page)
  await handlers['did-finish-load'][0]()
  assert.equal(statuses.at(-1), 'live')
  const event = { prevented: false, preventDefault() { this.prevented = true } }
  handlers['will-navigate'][0](event, stale)
  assert.equal(event.prevented, true)
  assert.equal(web.url, page)
  assert.equal(web.url.includes('ticket='), false)
  body = 'This viewer link has expired or is not valid. Reconnect'
  await handlers['did-finish-load'][0]()
  assert.equal(statuses.includes('refreshing'), true)
  assert.equal(web.url, page)
  panel.hide()
})

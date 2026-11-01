// Gives the page that the app's Host serves the app's own bridge. On Windows it also marks the
// page for the frameless window the way DSH Desktop's preload does
// (apps/desktop/src/preload-windows.ts, preload-platform.ts and preload-theme.ts; see NOTICE),
// but without data-platform: that puts DSH's shortcuts on native menu input, which this
// window does not have.
const { contextBridge, ipcRenderer } = require('electron')

const host = process.argv.find(value => value.startsWith('--ds-bot-origin='))?.slice('--ds-bot-origin='.length)
if (host !== undefined && location.origin === host) {
  // DS Bot's settings show and move the app's data location through this.
  contextBridge.exposeInMainWorld('dsBotApp', {
    dataLocation: () => ipcRenderer.invoke('ds-bot:data-location'),
    moveData: (workspace) => ipcRenderer.invoke('ds-bot:move-data', typeof workspace === 'string' ? workspace : undefined),
    teamWorkspaceChanged: (path) => { ipcRenderer.send('ds-bot:team-workspace', String(path)) },
    // The Bot browsers, in the shape of DSH Desktop's browser bridge so that ds-bot drives both
    // alike; `forget` clears a key's storage, which here outlives the app.
    browser: browserBridge(),
    // The app's own updater, for the About row's state and buttons.
    updates: updatesBridge(),
    // Frames and clicks go to spacesd in the main process. This page only draws
    // them. It never loads the ticket viewer.
    desktop: {
      open: () => ipcRenderer.invoke('ds-bot:screen-show'),
    },
    screen: screenBridge(),
  })
  if (!['127.0.0.1', 'localhost', '::1'].includes(location.hostname)) installScreenDock()
  const caption = process.argv.find(value => value.startsWith('--ds-bot-caption='))
  if (caption !== undefined) {
    ipcRenderer.on('ds-bot:fullscreen', (_event, fullscreen) => {
      const root = document.documentElement
      if (root === null) return
      if (fullscreen) root.dataset.fullscreen = 'true'
      else delete root.dataset.fullscreen
    })
    const start = () => { frameless(caption.slice('--ds-bot-caption='.length), process.argv.includes('--ds-bot-mica')) }
    // A preload runs before the document root exists.
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true })
    else start()
  }
}

function browserBridge() {
  const listeners = new Map()
  const viewListeners = new Set()
  ipcRenderer.on('ds-bot:browser-view-changed', (_event, change) => {
    for (const listener of [...viewListeners]) {
      try { listener(change) } catch (error) { console.error('DeepSeek Bot: a browser view listener failed', error) }
    }
  })
  ipcRenderer.on('ds-bot:browser-open-requested', (_event, request) => {
    if (typeof request?.lease !== 'string' || typeof request.url !== 'string') return
    for (const listener of [...(listeners.get(request.lease) ?? [])]) {
      try { listener(request.url) } catch (error) { console.error('DeepSeek Bot: a browser link handler failed', error) }
    }
  })
  return {
    acquire: key => ipcRenderer.invoke('ds-bot:browser-acquire', String(key)),
    release: lease => ipcRenderer.invoke('ds-bot:browser-release', String(lease)),
    forget: key => ipcRenderer.invoke('ds-bot:browser-forget', String(key)),
    views: {
      create: (botId, tabId, url) => ipcRenderer.invoke('ds-bot:browser-view-create', String(botId), String(tabId), typeof url === 'string' ? url : undefined),
      sync: botId => ipcRenderer.invoke('ds-bot:browser-view-sync', String(botId)),
      place: (tabId, rect, visible) => ipcRenderer.invoke('ds-bot:browser-view-place', String(tabId), rect, visible === true),
      navigate: (botId, tabId, url) => ipcRenderer.invoke('ds-bot:browser-view-navigate', String(botId), String(tabId), String(url)),
      command: (botId, tabId, command) => ipcRenderer.invoke('ds-bot:browser-view-command', String(botId), String(tabId), String(command)),
      focus: (botId, tabId) => ipcRenderer.invoke('ds-bot:browser-view-focus', String(botId), String(tabId)),
      read: (botId, tabId, script) => ipcRenderer.invoke('ds-bot:browser-view-read', String(botId), String(tabId), String(script)),
      close: (botId, tabId) => ipcRenderer.invoke('ds-bot:browser-view-close', String(botId), String(tabId)),
      hold: (botId, held) => ipcRenderer.invoke('ds-bot:browser-view-hold', String(botId), held === true),
      subscribe(listener) { viewListeners.add(listener); return () => viewListeners.delete(listener) },
    },
    // Cookie imports, only in the app: sources and a two-step pick/harvest → preview → apply.
    importSources: () => ipcRenderer.invoke('ds-bot:browser-import-sources'),
    importPick: () => ipcRenderer.invoke('ds-bot:browser-import-pick'),
    importLive: (source, close) => ipcRenderer.invoke('ds-bot:browser-import-live', String(source), close === true),
    importApply: (key, pending) => ipcRenderer.invoke('ds-bot:browser-import-apply', String(key), String(pending)),
    importCancel: (pending) => ipcRenderer.invoke('ds-bot:browser-import-cancel', String(pending)),
    onOpenRequested(lease, listener) {
      const id = String(lease)
      let set = listeners.get(id)
      if (set === undefined) { set = new Set(); listeners.set(id, set) }
      set.add(listener)
      return () => {
        set.delete(listener)
        if (set.size === 0 && listeners.get(id) === set) listeners.delete(id)
      }
    },
  }
}

function updatesBridge() {
  const listeners = new Set()
  ipcRenderer.on('ds-bot:app-update-changed', (_event, state) => {
    for (const listener of [...listeners]) {
      try { listener(state) } catch (error) { console.error('DeepSeek Bot: an update state handler failed', error) }
    }
  })
  return {
    state: () => ipcRenderer.invoke('ds-bot:app-update-state'),
    check: () => ipcRenderer.invoke('ds-bot:app-update-check'),
    install: () => ipcRenderer.invoke('ds-bot:app-update-install'),
    open: () => ipcRenderer.invoke('ds-bot:app-update-open'),
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

// A small preview in the corner. Clicking it opens a large screen below the
// caption buttons. The page's own thumb or stage owns the view when it has one.
function screenBridge() {
  const listeners = new Set()
  ipcRenderer.on('ds-bot:screen-frame', (_event, frame) => {
    for (const listener of listeners) {
      try { listener(frame) } catch (error) { console.error(error) }
    }
  })
  return {
    show: () => ipcRenderer.invoke('ds-bot:screen-show'),
    hide: () => ipcRenderer.invoke('ds-bot:screen-hide'),
    pointer: (point) => ipcRenderer.invoke('ds-bot:screen-pointer', point),
    type: (text) => ipcRenderer.invoke('ds-bot:screen-type', String(text ?? '')),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

function paintFrame(canvas, frame) {
  if (!canvas || frame?.state !== 'frame' || typeof frame.image !== 'string') return
  const image = new Image()
  image.onload = () => {
    canvas.width = frame.width || image.naturalWidth
    canvas.height = frame.height || image.naturalHeight
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  }
  image.src = `data:image/png;base64,${frame.image}`
}

function installScreenDock() {
  const mount = () => {
    if (document.getElementById('ds-screen-dock')) return
    const caption = process.argv.find(value => value.startsWith('--ds-bot-caption='))
    const top = Math.max(48, caption === undefined ? 0 : Number(caption.slice('--ds-bot-caption='.length)) || 0)
    const style = document.createElement('style')
    style.textContent = '#ds-screen-dock{position:fixed;right:16px;bottom:16px;width:260px;z-index:40;display:flex;flex-direction:column;background:#1c1c1e;color:#f5f5f5;border:1px solid rgba(255,255,255,.12);border-radius:12px;overflow:hidden;font:12px/1.3 sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35)}#ds-screen-dock[hidden]{display:none}#ds-screen-dock .thumb{height:146px;background:#111;cursor:pointer}#ds-screen-dock .cap{padding:8px 10px;color:#c8c8c8}#ds-screen-overlay{position:fixed;left:24px;right:24px;bottom:24px;z-index:60;display:none;flex-direction:column;background:#111;color:#f5f5f5;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12)}#ds-screen-overlay.open{display:flex}#ds-screen-overlay .bar{display:flex;align-items:center;gap:8px;height:40px;padding:0 10px;flex:none}#ds-screen-overlay button{border:0;background:rgba(255,255,255,.12);color:inherit;border-radius:8px;height:26px;padding:0 8px;cursor:pointer}#ds-screen-overlay .stage{flex:1;min-height:0}'
    document.documentElement.append(style)
    const dock = document.createElement('div')
    dock.id = 'ds-screen-dock'
    const thumb = document.createElement('canvas')
    thumb.className = 'thumb'
    const captionLabel = document.createElement('div')
    captionLabel.className = 'cap'
    captionLabel.textContent = 'Screen'
    dock.append(thumb, captionLabel)
    const overlay = document.createElement('div')
    overlay.id = 'ds-screen-overlay'
    overlay.style.top = `${top}px`
    const bar = document.createElement('div')
    bar.className = 'bar'
    const label = document.createElement('span')
    label.textContent = 'Screen'
    const status = document.createElement('span')
    const button = (text, action) => {
      const node = document.createElement('button')
      node.type = 'button'
      node.textContent = text
      node.addEventListener('click', action)
      return node
    }
    const stage = document.createElement('canvas')
    stage.className = 'stage'
    let expanded = false
    let frame = null
    const shown = () => (expanded ? stage : thumb)
    const pointOf = (event, canvas) => {
      const box = canvas.getBoundingClientRect()
      if (!frame?.width || !box.width) return null
      return {
        x: event.offsetX, y: event.offsetY,
        viewWidth: box.width, viewHeight: box.height,
      }
    }
    const onPointer = (event) => {
      const canvas = event.currentTarget
      const point = pointOf(event, canvas)
      if (point) void ipcRenderer.invoke('ds-bot:screen-pointer', point)
    }
    thumb.addEventListener('pointerdown', (event) => { expanded = true; sync(); onPointer(event) })
    stage.addEventListener('pointerdown', onPointer)
    stage.tabIndex = 0
    stage.addEventListener('keydown', (event) => {
      if (event.key.length === 1 || event.key === 'Enter') {
        event.preventDefault()
        void ipcRenderer.invoke('ds-bot:screen-type', event.key === 'Enter' ? '\n' : event.key)
      }
    })
    bar.append(label, status, button('×', () => { expanded = false; sync() }))
    overlay.append(bar, stage)
    document.documentElement.append(dock, overlay)
    const sync = () => {
      const owned = document.querySelector('[data-screen-thumb]')
      const ownedBox = owned?.getBoundingClientRect()
      const pageOwns = ownedBox && ownedBox.width >= 8 && ownedBox.height >= 8
      dock.hidden = expanded || Boolean(pageOwns)
      overlay.classList.toggle('open', expanded && !pageOwns)
    }
    ipcRenderer.on('ds-bot:screen-frame', (_event, next) => {
      frame = next
      paintFrame(thumb, next)
      paintFrame(stage, next)
      if (next?.state === 'needs-token') status.textContent = 'Set CUA_ENV_TOKEN'
      else if (next?.state === 'error') status.textContent = 'Desktop unavailable'
      else status.textContent = ''
    })
    void ipcRenderer.invoke('ds-bot:screen-show')
    window.addEventListener('pagehide', () => { void ipcRenderer.invoke('ds-bot:screen-hide') }, { once: true })
    sync()
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', mount, { once: true })
  else mount()
}

function frameless(height, mica) {
  const root = document.documentElement
  root.dataset.windowsTitlebar = ''
  root.style.setProperty('--dsh-windows-titlebar-height', `${height}px`)
  // DSH keeps the dialog mask off the caption band, which then stays bright above a dimmed
  // page; here the band is part of the page, so the mask covers it too.
  root.style.setProperty('--dsh-frame-chrome-top', '0px')
  let theme
  const sendTheme = () => {
    const value = root.getAttribute('data-ds-theme-source')
    if (value === null || value === theme) return
    theme = value
    ipcRenderer.send('ds-bot:native-theme', value)
  }
  new MutationObserver(sendTheme).observe(root, { attributeFilter: ['data-ds-theme-source'] })
  sendTheme()
  captionColors(mica)
}

// The caption buttons stand on the rightmost open column with Mica (the right sidebar or the
// conversation) and on the sidebar-colored band without it. Theme variables can resolve apart
// from what is painted, so the color comes from the element itself: the first one up from it
// that is not transparent.
function captionColors(mica) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) return
  const opaque = (color) => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
    return alpha === 0 ? undefined : `rgb(${red}, ${green}, ${blue})`
  }
  // The surface's color with the layers above the caption buttons (a dialog's mask) painted over it.
  const covered = (base, frame) => {
    const layers = []
    for (const element of document.elementsFromPoint(innerWidth - 1, 1)) {
      if (frame !== null && (element === frame || element.contains(frame) || frame.contains(element))) break
      for (const pseudo of ['::after', null, '::before']) layers.push(getComputedStyle(element, pseudo).backgroundColor)
    }
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = base
    context.fillRect(0, 0, 1, 1)
    for (const color of layers.reverse()) {
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
    }
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
    return `rgb(${red}, ${green}, ${blue})`
  }
  const column = () => {
    if (!mica) return document.querySelector('div[class*="_sidebarCol"]')
    const right = document.querySelector('div[class*="_rightbarCol"]')
    return right !== null && right.getBoundingClientRect().width > 0 ? right : document.querySelector('div[class*="_centerCol"]')
  }
  let frame
  const surface = () => {
    const start = column()
    // Opening or closing the right sidebar changes the frame's columns.
    if (start !== null && frame === undefined) {
      frame = start.parentElement
      observer.observe(frame, { attributes: true, attributeFilter: ['style'] })
    }
    for (let element = start; element !== null; element = element.parentElement) {
      const color = opaque(getComputedStyle(element).backgroundColor)
      if (color !== undefined) return [covered(color, frame ?? null), opaque(getComputedStyle(element).color)]
    }
    return undefined
  }
  let sent = ''
  let tries = 0
  const send = () => {
    const colors = surface()
    // The frame appears once DSH has booted; until then the main process's colors hold.
    if (colors === undefined || colors[1] === undefined) {
      if (tries++ < 120) setTimeout(send, 250)
      return
    }
    const current = colors.join()
    if (current === sent) return
    sent = current
    ipcRenderer.send('ds-bot:caption-colors', ...colors)
  }
  // A dialog mounts anywhere in the page, which changes all the time; one look per frame.
  let queued = false
  const queue = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => { queued = false; send() })
  }
  const observer = new MutationObserver(queue)
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'style'], childList: true, subtree: true })
  observer.observe(document.head, { childList: true, subtree: true, characterData: true })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ds-theme-source', 'style'] })
  // A stylesheet link is added before it loads; its rules apply without another mutation.
  document.head.addEventListener('load', send, true)
  send()
}

import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from './i18n.js'
import { embeddedScreen, requestLiveDesktop, screenIdFor } from './virtual-screen.js'

function liveDesktop() {
  const desktop = globalThis.dsBotApp?.desktop
  return typeof desktop?.open === 'function' ? desktop : null
}

export function VirtualScreenView({ bot, onDetails, onLibrary, onBrowser }) {
  const name = bot?.name || t('Bot')
  const screenId = bot ? screenIdFor(bot.id) : ''
  const thumb = useRef(null)
  const stage = useRef(null)
  const screen = embeddedScreen()
  const desktop = screen ? null : liveDesktop()
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [status, setStatus] = useState('')
  useLayoutEffect(() => {
    const node = open ? stage.current : thumb.current
    if (!node || !screen) return undefined
    const place = () => {
      const box = node.getBoundingClientRect()
      void screen.place({ left: box.left, top: box.top, width: box.width, height: box.height })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(node)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [bot?.id, open, screen])
  useEffect(() => {
    if (!screen) return undefined
    return () => { void screen.hide() }
  }, [screen])
  const changeZoom = (direction) => {
    void Promise.resolve(screen.zoom(direction)).then((next) => {
      if (typeof next === 'number') setZoom(next)
    })
  }
  const reload = () => {
    setStatus(t('Refreshing the desktop…'))
    void Promise.resolve(screen.reload()).finally(() => setStatus(''))
  }
  const preview = h('button', {
    ref: thumb,
    type: 'button',
    className: 'bt-screen-thumb',
    'data-screen-thumb': '',
    'aria-label': t("{name}'s screen", { name }),
    onClick: () => { if (screen) setOpen(true); else if (desktop) requestLiveDesktop(desktop, bot) },
  })
  return h('div', {
    className: 'bt-panel-view bt-screen',
    'data-screen': screenId,
  },
  h('div', { className: 'bt-screen-tabs', role: 'tablist' },
    h('button', { type: 'button', onClick: onDetails }, t('Details')),
    h('button', { type: 'button', onClick: onLibrary }, t('Knowledge')),
    onBrowser ? h('button', { type: 'button', onClick: onBrowser }, t('Browser')) : null,
    h('button', { type: 'button', 'aria-selected': 'true' }, t('Computer'))),
  h('div', { className: 'bt-screen-card' },
    preview,
    h('div', { className: 'bt-screen-cap' }, t("{name}'s screen", { name }))),
  open && screen ? createPortal(h('div', { className: 'bt-screen-overlay' },
    h('div', { className: 'bt-screen-bar' },
      h('span', null, t("{name}'s screen", { name })),
      h('span', null, status),
      h('span', { className: 'bt-screen-zoom' },
        h('button', { type: 'button', className: 'bt-screen-back', onClick: () => changeZoom(-1), 'aria-label': t('Zoom out') }, '−'),
        h('span', null, `${Math.round(zoom * 100)}%`),
        h('button', { type: 'button', className: 'bt-screen-back', onClick: () => changeZoom(1), 'aria-label': t('Zoom in') }, '+'),
        h('button', { type: 'button', className: 'bt-screen-back', onClick: reload }, t('Reload'))),
      h('button', { type: 'button', className: 'bt-screen-back', onClick: () => setOpen(false) }, t('Close'))),
    h('div', {
      ref: stage,
      className: 'bt-screen-stage',
      'data-screen-stage': '',
      role: 'region',
      'aria-label': t('Virtual screen'),
    })), document.body) : null)
}

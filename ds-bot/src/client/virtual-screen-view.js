import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { t } from './i18n.js'
import { embeddedScreen, requestLiveDesktop, screenIdFor } from './virtual-screen.js'

function liveDesktop() {
  const desktop = globalThis.dsBotApp?.desktop
  return typeof desktop?.open === 'function' ? desktop : null
}

export function VirtualScreenView({ bot, onDetails }) {
  const name = bot?.name || t('Bot')
  const screenId = bot ? screenIdFor(bot.id) : ''
  const stage = useRef(null)
  const screen = embeddedScreen()
  const desktop = screen ? null : liveDesktop()
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const node = stage.current
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
      void screen.hide()
    }
  }, [bot?.id, screen])
  useEffect(() => {
    if (desktop && bot) requestLiveDesktop(desktop, bot)
  }, [bot?.id, desktop])
  const changeZoom = (direction) => {
    void Promise.resolve(screen.zoom(direction)).then((next) => {
      if (typeof next === 'number') setZoom(next)
    })
  }
  return h('div', {
    className: 'bt-panel-view bt-screen',
    'data-screen': screenId,
  },
  h('div', { className: 'bt-screen-bar' },
    h('span', null, t("{name}'s screen", { name })),
    screen ? h('span', { className: 'bt-screen-zoom' },
      h('button', { type: 'button', className: 'bt-screen-back', onClick: () => changeZoom(-1), 'aria-label': t('Zoom out') }, '−'),
      h('span', null, `${Math.round(zoom * 100)}%`),
      h('button', { type: 'button', className: 'bt-screen-back', onClick: () => changeZoom(1), 'aria-label': t('Zoom in') }, '+'),
      h('button', { type: 'button', className: 'bt-screen-back', onClick: () => { void screen.reload() } }, t('Reload'))) : null,
    h('button', { type: 'button', className: 'bt-screen-back', onClick: onDetails }, t('Details'))),
  h('p', { className: 'bt-screen-note' }, screen
    ? t('Click the desktop to type. Other Bots cannot see or type on this screen.')
    : t('This Bot has its own screen. Other Bots cannot see or type on it.')),
  h('div', {
    ref: stage,
    className: 'bt-screen-stage',
    'data-screen-stage': screen ? '' : undefined,
    role: 'region',
    'aria-label': t('Virtual screen'),
  },
  screen ? null : h('div', { className: 'bt-screen-empty' },
    h('strong', null, name),
    desktop
      ? h('button', { type: 'button', className: 'bt-screen-back', onClick: () => requestLiveDesktop(desktop, bot) }, t('Open live desktop'))
      : null,
    h('p', null, desktop ? t('The live desktop is open in its own window.') : t('The live desktop opens in the desktop app.')),
    h('p', { className: 'bt-screen-note' }, t('Shared machine')))))
}

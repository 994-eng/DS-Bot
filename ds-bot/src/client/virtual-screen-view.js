import { createElement as h, useEffect, useRef, useState } from 'react'
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
  const [status, setStatus] = useState('')
  const frame = useRef(null)
  useEffect(() => {
    if (!screen) return undefined
    void screen.show?.()
    const draw = (canvas, next) => {
      if (!canvas || next?.state !== 'frame' || typeof next.image !== 'string') return
      const image = new Image()
      image.onload = () => {
        canvas.width = next.width || image.naturalWidth
        canvas.height = next.height || image.naturalHeight
        canvas.getContext('2d')?.drawImage(image, 0, 0)
      }
      image.src = `data:image/png;base64,${next.image}`
    }
    const stop = screen.subscribe((next) => {
      frame.current = next
      draw(thumb.current, next)
      draw(stage.current, next)
      if (next?.state === 'needs-token') setStatus(t('Set CUA_ENV_TOKEN on this computer.'))
      else if (next?.state === 'error') setStatus(next.message || t('Desktop unavailable'))
      else setStatus('')
    })
    return () => { stop?.(); void screen.hide?.() }
  }, [screen])
  const sendPointer = (event) => {
    const canvas = event.currentTarget
    const box = canvas.getBoundingClientRect()
    const shot = frame.current
    if (!screen || !shot?.width || !box.width) return
    void screen.pointer({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, viewWidth: box.width, viewHeight: box.height })
  }
  const preview = h('canvas', {
    ref: thumb,
    className: 'bt-screen-thumb',
    'data-screen-thumb': '',
    'aria-label': t("{name}'s screen", { name }),
    onClick: () => { if (screen) setOpen(true); else if (desktop) requestLiveDesktop(desktop, bot) },
    onPointerDown: sendPointer,
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
      h('button', { type: 'button', className: 'bt-screen-back', onClick: () => setOpen(false) }, t('Close'))),
    h('canvas', {
      ref: stage,
      className: 'bt-screen-stage',
      'data-screen-stage': '',
      role: 'img',
      'aria-label': t('Virtual screen'),
      tabIndex: 0,
      onPointerDown: sendPointer,
      onKeyDown: (event) => {
        if (!screen) return
        if (event.key.length === 1 || event.key === 'Enter') {
          event.preventDefault()
          void screen.type(event.key === 'Enter' ? '\n' : event.key)
        }
      },
    })), document.body) : null)
}

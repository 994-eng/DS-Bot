import { createElement as h } from 'react'
import { t } from './i18n.js'
import { screenIdFor } from './virtual-screen.js'

export function VirtualScreenView({ bot, onDetails, onInput }) {
  const name = bot?.name || t('Bot')
  const screenId = bot ? screenIdFor(bot.id) : ''
  return h('div', {
    className: 'bt-panel-view bt-screen',
    'data-screen': screenId,
  },
  h('div', { className: 'bt-screen-bar' },
    h('span', null, t("{name}'s screen", { name })),
    h('button', { type: 'button', className: 'bt-screen-back', onClick: onDetails }, t('Details'))),
  h('div', {
    className: 'bt-screen-stage',
    role: 'img',
    'aria-label': t('Virtual screen'),
    onPointerDown: (event) => onInput?.({ type: 'pointer', x: event.clientX, y: event.clientY }),
  },
  h('div', { className: 'bt-screen-empty' },
    h('strong', null, name),
    h('p', null, t('This Bot has its own screen. Other Bots cannot see or type on it.')),
    h('p', { className: 'bt-screen-note' }, t('Shared machine')))))
}

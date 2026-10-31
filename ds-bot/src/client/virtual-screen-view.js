import { createElement as h, useEffect } from 'react'
import { t } from './i18n.js'
import { requestLiveDesktop, screenIdFor } from './virtual-screen.js'

function liveDesktop() {
  const desktop = globalThis.dsBotApp?.desktop
  return typeof desktop?.open === 'function' ? desktop : null
}

export function VirtualScreenView({ bot, onDetails }) {
  const name = bot?.name || t('Bot')
  const screenId = bot ? screenIdFor(bot.id) : ''
  const desktop = liveDesktop()
  useEffect(() => {
    if (desktop && bot) requestLiveDesktop(desktop, bot)
  }, [bot?.id])
  return h('div', {
    className: 'bt-panel-view bt-screen',
    'data-screen': screenId,
  },
  h('div', { className: 'bt-screen-bar' },
    h('span', null, t("{name}'s screen", { name })),
    h('button', { type: 'button', className: 'bt-screen-back', onClick: onDetails }, t('Details'))),
  h('p', { className: 'bt-screen-note' }, t('This Bot has its own screen. Other Bots cannot see or type on it.')),
  h('div', {
    className: 'bt-screen-stage',
    role: 'region',
    'aria-label': t('Virtual screen'),
  },
  h('div', { className: 'bt-screen-empty' },
    h('strong', null, name),
    desktop
      ? h('button', { type: 'button', className: 'bt-screen-back', onClick: () => requestLiveDesktop(desktop, bot) }, t('Open live desktop'))
      : null,
    h('p', null, desktop ? t('The live desktop is open in its own window.') : t('The live desktop opens in the desktop app.')),
    h('p', { className: 'bt-screen-note' }, t('Shared machine')))))
}

// Playwright is the fallback when ego is not on the machine. DS-Bot's existing
// browser plugins keep their own Playwright attach to the desktop panel; this
// helper only connects a CDP endpoint, such as Chrome on Windows.

export function windowsCdpTarget(endpoint) {
  if (!endpoint) throw new Error('A CDP endpoint is required.')
  return { os: 'windows', kind: 'cdp', endpoint, preferred: 'ego', fallback: 'playwright' }
}

export async function connectPlaywright(endpoint, { load } = {}) {
  windowsCdpTarget(endpoint)
  const importer = load ?? (() => import('playwright'))
  let pw
  try {
    pw = await importer()
  } catch (error) {
    const wrapped = new Error('Playwright is not installed. ego is the browser path; Playwright is only the fallback.')
    wrapped.cause = error
    throw wrapped
  }
  const chromium = pw.chromium ?? pw.default?.chromium
  if (!chromium?.connectOverCDP) throw new Error('This Playwright build has no chromium.connectOverCDP.')
  return chromium.connectOverCDP(endpoint)
}

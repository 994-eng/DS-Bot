// The packaged client opens this server's DSH web. Chat and the model list live
// there, so the installer does not carry an API key. DS_BOT_SERVER=local keeps
// the app on its own Host (the package check). A full http URL overrides the
// default, for the address `dsh web` prints when the server asks for its own
// connection token. That URL stays on the machine. It is not part of this repo.

export const DEFAULT_SERVER = 'http://38.76.188.71:3080'

export function serverUrl(env = process.env) {
  const override = env.DS_BOT_SERVER
  if (override === 'local') return undefined
  if (typeof override === 'string' && override.startsWith('http')) return override.replace(/\/$/, '')
  return DEFAULT_SERVER
}

export function serverPage(env = process.env) {
  const server = serverUrl(env)
  if (!server) return undefined
  const url = new URL(server)
  if (url.pathname === '') url.pathname = '/'
  return url.toString()
}

export function isAppServer(url, env = process.env) {
  const server = serverUrl(env)
  if (!server) return false
  try {
    const page = new URL(url)
    const home = new URL(server)
    return page.protocol === home.protocol && page.hostname === home.hostname && page.port === home.port
  } catch {
    return false
  }
}

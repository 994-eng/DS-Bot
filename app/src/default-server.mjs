// The packaged Windows client opens this server with no account step.
// DS_BOT_SERVER=local keeps the app on its own Host (used by the package check).

export const DEFAULT_SERVER = 'http://38.76.188.71:3080'

export function serverUrl(env = process.env) {
  const override = env.DS_BOT_SERVER
  if (override === 'local') return undefined
  if (typeof override === 'string' && override.startsWith('http')) return override.replace(/\/$/, '')
  return DEFAULT_SERVER
}

// The address the window loads. A query or hash on DS_BOT_SERVER is kept, so a
// connection URL printed by `dsh web` can be used without putting it in git.
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

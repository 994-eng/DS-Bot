// The packaged Windows client opens this server with no account step.
// DS_BOT_SERVER=local keeps the app on its own Host (used by the package check).

export const DEFAULT_SERVER = 'http://38.76.188.71:3080'

export function serverUrl(env = process.env) {
  const override = env.DS_BOT_SERVER
  if (override === 'local') return undefined
  if (typeof override === 'string' && override.startsWith('http')) return override.replace(/\/$/, '')
  return DEFAULT_SERVER
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

// The Windows client opens this machine with no account. The env token, if the
// server requires one, stays on that server. This file never carries it.

export const CLOUD_HOST = '38.76.188.71'
export const SPACESD_PORT = 3211

export function cloudConnection() {
  const host = CLOUD_HOST
  const port = SPACESD_PORT
  return {
    host,
    port,
    auth: 'none',
    login: null,
    register: null,
    email: null,
    spacesdUrl: `http://${host}:${port}`,
    viewerUrl: `http://${host}:${port}/viewer/`,
    routes: ['/viewer/'],
  }
}

// Fills the desktop's default URLs. It does not set a token and it does not
// add a login, registration, or email field.
export function applyCloudDefaults(env = {}) {
  const next = { ...env }
  const connection = cloudConnection()
  if (!next.DS_BOT_SPACESD_URL) next.DS_BOT_SPACESD_URL = connection.spacesdUrl
  if (!next.DS_BOT_VIEWER_URL) next.DS_BOT_VIEWER_URL = connection.viewerUrl
  return next
}

// The Windows client's default machine. Kept in step with app/src/cloud-backend.mjs.
export const CLOUD_HOST = '38.76.188.71'
export const SPACESD_PORT = 3211

export function remoteDesktop(port = SPACESD_PORT) {
  return {
    host: CLOUD_HOST,
    port,
    auth: 'none',
    spacesdUrl: `http://${CLOUD_HOST}:${port}`,
    viewerUrl: `http://${CLOUD_HOST}:${port}/viewer/`,
  }
}

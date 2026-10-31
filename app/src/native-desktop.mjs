// The in-app screen. Frames and input go to Cua spacesd on port 3211.
// Nothing is loaded from the ticket viewer or from :8890, and nothing is
// posted through DeepSeek Harness. The env token is a header only.
import { readDesktopToken } from './desktop-viewer.mjs'
import { captureDesktop, desktopClick, desktopType, spacesdBase } from './spacesd-rpc.mjs'

export function mapFramePoint(localX, localY, viewWidth, viewHeight, frameWidth, frameHeight) {
  const viewW = Number(viewWidth)
  const viewH = Number(viewHeight)
  const frameW = Number(frameWidth)
  const frameH = Number(frameHeight)
  if (!(viewW > 0) || !(viewH > 0) || !(frameW > 0) || !(frameH > 0)) return null
  const x = Math.min(frameW, Math.max(0, (Number(localX) / viewW) * frameW))
  const y = Math.min(frameH, Math.max(0, (Number(localY) / viewH) * frameH))
  return { x, y }
}

export function createNativeDesktop({
  env = process.env,
  fetchImpl,
  readToken = readDesktopToken,
  capture = captureDesktop,
  click = desktopClick,
  typeText = desktopType,
  onFrame = () => {},
  intervalMs = 400,
} = {}) {
  let timer
  let running = false
  let screenshotId = ''
  let width = 0
  let height = 0

  async function tick() {
    const token = readToken(env)
    const base = spacesdBase(env)
    if (!token) {
      onFrame({ state: 'needs-token' })
      return
    }
    if (base.includes(':8890') || base.includes('/desktop')) {
      onFrame({ state: 'error', message: 'The screen talks to spacesd on port 3211, not the ticket page.' })
      return
    }
    try {
      const shot = await capture({ base, token, fetchImpl })
      screenshotId = shot.screenshotId
      width = shot.width
      height = shot.height
      onFrame({ state: 'frame', image: shot.image, width, height })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      onFrame({ state: 'error', message: message.includes(token) ? 'spacesd refused the screenshot.' : message })
    }
  }

  function loop() {
    if (!running) return
    void tick().finally(() => {
      if (!running) return
      timer = setTimeout(loop, intervalMs)
    })
  }

  return {
    base: spacesdBase(env),
    start() {
      if (running) return
      running = true
      loop()
    },
    stop() {
      running = false
      clearTimeout(timer)
    },
    async pointer(point) {
      const token = readToken(env)
      const mapped = mapFramePoint(point?.x, point?.y, point?.viewWidth, point?.viewHeight, width, height)
      if (!token || !screenshotId || !mapped) return false
      await click({ base: spacesdBase(env), token, x: mapped.x, y: mapped.y, screenshotId, fetchImpl })
      return true
    },
    async type(text) {
      const token = readToken(env)
      const value = typeof text === 'string' ? text : ''
      if (!token || value === '') return false
      await typeText({ base: spacesdBase(env), token, text: value, fetchImpl })
      return true
    },
  }
}

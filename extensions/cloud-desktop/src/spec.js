import { classifyLaunch } from '../../computer-use/src/approval.js'

export const CUA_LINUX_IMAGE = 'ghcr.io/trycua/linux:24.04'
export const SPACESD_PORT = 3211

// One machine, one shared data directory, one cua-spacesd. Each Bot gets a
// display id on that spacesd. The env token is not part of this description.
export function cloudDesktopSpec({
  name = 'ds-bot-desktop',
  sharedData = '/var/lib/ds-bot/shared',
  image = CUA_LINUX_IMAGE,
  display = ':1',
  spacesdPort = SPACESD_PORT,
  novncPort = 6080,
} = {}) {
  return {
    name,
    substrate: 'cua-spacesd',
    image,
    display,
    sharedData,
    spacesd: {
      port: spacesdPort,
      listen: `127.0.0.1:${spacesdPort}`,
      protocol: 'grpc',
      grpcWeb: true,
      viewerPath: '/viewer/',
    },
    viewer: { novncPort },
    fallbackDisplay: ['Xvfb', display, '-screen', '0', '1280x800x24'],
  }
}

export function assignBotScreens(botIds) {
  return botIds.map(botId => ({
    botId,
    displayId: `bot:${botId}`,
    screenId: `screen:${botId}`,
  }))
}

export function containerArgv(spec) {
  return [
    'docker', 'run', '--rm',
    '--name', spec.name,
    '-p', `127.0.0.1:${spec.spacesd.port}:${spec.spacesd.port}`,
    '-p', `127.0.0.1:${spec.viewer.novncPort}:6080`,
    '-v', `${spec.sharedData}:/data`,
    '-e', `DISPLAY=${spec.display}`,
    spec.image,
  ]
}

// Records the command after approval. It does not start Docker or Xvfb.
export async function requestLaunch(spec, gate) {
  await gate.allow(classifyLaunch())
  return {
    approved: true,
    started: false,
    argv: containerArgv(spec),
    reason: 'Launch is recorded only. Start the container on the machine you control.',
  }
}

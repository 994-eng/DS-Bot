import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApprovalGate } from '../../computer-use/src/approval.js'
import { assignBotScreens, cloudDesktopSpec, containerArgv, requestLaunch } from '../src/spec.js'

test('one shared machine assigns a display to each Bot', () => {
  const spec = cloudDesktopSpec()
  assert.equal(spec.substrate, 'cua-spacesd')
  assert.equal(spec.spacesd.port, 3211)
  assert.equal(spec.spacesd.viewerPath, '/viewer/')
  assert.equal(spec.sharedData, '/var/lib/ds-bot/shared')
  const screens = assignBotScreens(['alpha', 'beta'])
  assert.equal(screens[0].displayId, 'bot:alpha')
  assert.notEqual(screens[0].screenId, screens[1].screenId)
  const argv = containerArgv(spec)
  assert.equal(argv.includes(spec.image), true)
  assert.equal(argv.some(part => part.includes('3211')), true)
  assert.equal(argv.some(part => /token/i.test(part)), false)
})

test('starting the desktop waits for approval and does not spawn', async () => {
  const spec = cloudDesktopSpec()
  const denied = new ApprovalGate(async () => false)
  await assert.rejects(requestLaunch(spec, denied), /display\.launch/)
  const allowed = new ApprovalGate(async () => true)
  const plan = await requestLaunch(spec, allowed)
  assert.equal(plan.started, false)
  assert.equal(plan.argv[0], 'docker')
})

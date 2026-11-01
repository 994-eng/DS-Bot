import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApprovalDenied, ApprovalGate, classifyCdp, classifySpacesd } from '../src/approval.js'

test('screenshots are ordinary and clipboard reads are privileged', () => {
  assert.equal(classifySpacesd('ComputerService/Screenshot').privileged, false)
  assert.equal(classifySpacesd('ComputerService/GetClipboard').id, 'clipboard.read')
})

test('the default gate denies a privileged call', async () => {
  const gate = new ApprovalGate()
  await assert.rejects(
    gate.allow(classifySpacesd('ComputerService/GetClipboard')),
    ApprovalDenied,
  )
  const allowed = await gate.allow(classifySpacesd('ComputerService/Pointer'))
  assert.equal(allowed.privileged, false)
})

test('an approver can allow one privileged CDP read', async () => {
  const seen = []
  const gate = new ApprovalGate(async (check) => {
    seen.push(check.id)
    return check.id === 'cookies.read'
  })
  const yes = await gate.allow(classifyCdp('Network.getCookies'))
  assert.equal(yes.allowed, true)
  assert.deepEqual(seen, ['cookies.read'])
  await assert.rejects(gate.allow(classifyCdp('Network.enable', { raw: true })), ApprovalDenied)
})

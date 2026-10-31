import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createVirtualScreenHost } from '../src/virtual-screens.mjs'

test('Bots share the machine and not the framebuffer', () => {
  const host = createVirtualScreenHost()
  host.open('alpha')
  host.open('beta')
  assert.equal(host.sharedRoot, '/data')
  host.input('alpha', { type: 'pointer', x: 1, y: 1, r: 9, g: 8, b: 7 })
  const alpha = host.frame('alpha')
  const beta = host.frame('beta')
  assert.equal(alpha[1 * 8 * 3 + 3], 9)
  assert.equal(beta[1 * 8 * 3 + 3], 0)
  alpha[0] = 99
  assert.equal(host.frame('alpha')[0], 0)
  assert.notEqual(host.list()[0].screenId, host.list()[1].screenId)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { install } from '../src/host/prompt.js'
import { FORK_CAPABILITIES, FORK_IDENTITY_PROMPT } from '../src/host/fork-identity.js'
import { fakeContext } from './fake-ctx.js'

function lf(text) {
  return text.replace(/\r\n/g, '\n')
}

test('the identity prompt matches the doc and names EGO and CUA', () => {
  // Windows checkout can rewrite the doc to CRLF. The words are what must match.
  const doc = lf(readFileSync(new URL('../../docs/harness-identity-prompt.md', import.meta.url), 'utf8'))
  assert.equal(lf(FORK_IDENTITY_PROMPT), doc)
  assert.match(FORK_IDENTITY_PROMPT, /EGO capability/)
  assert.match(FORK_IDENTITY_PROMPT, /CUA capability/)
  assert.match(FORK_IDENTITY_PROMPT, /spacesd/)
  assert.match(FORK_IDENTITY_PROMPT, /38\.76\.188\.71:3211/)
  assert.doesNotMatch(FORK_IDENTITY_PROMPT, /CUA_ENV_TOKEN|Bearer /)
  assert.deepEqual(FORK_CAPABILITIES.map(item => item.name), ['cua', 'ego'])
})

test('DSH receives the fork prompt as its own system section', (t) => {
  const ctx = fakeContext()
  t.after(() => ctx.dispose())
  install({
    ctx,
    selfOf: id => id,
    botOf: () => ({ name: 'Chief' }),
    roomOf: () => undefined,
    isMain: () => false,
  })
  const section = ctx.sections.get('fork-environment')
  assert.equal(section.order, 630)
  assert.equal(section.interpolate, false)
  const text = section.text()
  assert.match(text, /Use the EGO tools/)
  assert.match(text, /Use the CUA tools/)
  assert.match(text, /Do not switch to the other capability/)
})

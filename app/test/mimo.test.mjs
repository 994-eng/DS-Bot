import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { mkdirSync } from 'node:fs'
import { applyMimoEnv, MIMO_BASE_URL, MIMO_DEFAULT_MODEL, MIMO_MODELS, writePackedCredentials } from '../src/mimo.mjs'
import { mimoPatchDocument, reconcileMimo } from '../src/mimo-patch.mjs'

test('the MiMo route is the default and the patch has no key', () => {
  const text = mimoPatchDocument()
  assert.match(text, new RegExp(MIMO_BASE_URL.replace(/[.]/g, '\\.')))
  assert.match(text, /api: openai-completions/)
  assert.match(text, /apiKeyEnv: MIMO_API_KEY/)
  for (const model of MIMO_MODELS) assert.match(text, new RegExp(model.id))
  assert.match(text, new RegExp(`model: ${MIMO_DEFAULT_MODEL}`))
  assert.equal(text.includes('sk-'), false)
})

test('a key is taken from the environment or a file outside the repo', () => {
  const env = {}
  assert.equal(applyMimoEnv(env, { readFileSync }), false)
  env.MIMO_API_KEY = 'from-env'
  assert.equal(applyMimoEnv(env, { readFileSync }), true)
  assert.equal(env.MIMO_API_KEY, 'from-env')
  const dir = mkdtempSync(join(tmpdir(), 'mimo-'))
  const file = join(dir, 'credentials.json')
  writeFileSync(file, JSON.stringify({ apiKey: 'from-file' }))
  const empty = {}
  assert.equal(applyMimoEnv(empty, { readFileSync, paths: [file] }), true)
  assert.equal(empty.MIMO_API_KEY, 'from-file')
  rmSync(dir, { recursive: true, force: true })
  const home = mkdtempSync(join(tmpdir(), 'mimo-home-'))
  const written = reconcileMimo({ dir: join(home, 'profiles', 'ds-bot') })
  const patch = readFileSync(written[0], 'utf8')
  assert.match(patch, /mimo-v2\.6-flash/)
  assert.match(patch, /mimo\.ezlook\.top/)
  assert.equal(patch.includes('from-file'), false)
  rmSync(home, { recursive: true, force: true })
  const pack = mkdtempSync(join(tmpdir(), 'mimo-pack-'))
  const dest = join(pack, 'mimo-credentials.json')
  assert.deepEqual(writePackedCredentials({}, { mkdirSync, writeFileSync, dest }), { mimo: false, cua: false })
  assert.equal(readFileSync(dest, 'utf8').includes('pack-key'), false)
  assert.deepEqual(writePackedCredentials({ MIMO_API_KEY: 'pack-key', CUA_ENV_TOKEN: 'cua-pack' }, { mkdirSync, writeFileSync, dest }), { mimo: true, cua: true })
  const saved = JSON.parse(readFileSync(dest, 'utf8'))
  assert.equal(saved.MIMO_API_KEY, 'pack-key')
  assert.equal(saved.CUA_ENV_TOKEN, 'cua-pack')
  rmSync(pack, { recursive: true, force: true })
})

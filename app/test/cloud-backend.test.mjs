import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { applyCloudDefaults, CLOUD_HOST, cloudConnection } from '../src/cloud-backend.mjs'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../src')
const ROUTE = /['"`]\/(login|register|signup|sign-up|sign-in)['"`]/

test('the desktop client defaults to the cloud spacesd and viewer', () => {
  const connection = cloudConnection()
  assert.equal(connection.host, '38.76.188.71')
  assert.equal(CLOUD_HOST, '38.76.188.71')
  assert.equal(connection.port, 3211)
  assert.equal(connection.spacesdUrl, 'http://38.76.188.71:3211')
  assert.equal(connection.viewerUrl, 'http://38.76.188.71:3211/viewer/')
  assert.equal(connection.auth, 'none')
  assert.equal(connection.login, null)
  assert.equal(connection.register, null)
  assert.equal(connection.email, null)
})

test('defaults fill empty URLs and do not invent a token', () => {
  const env = applyCloudDefaults({})
  assert.equal(env.DS_BOT_SPACESD_URL, 'http://38.76.188.71:3211')
  assert.equal(env.DS_BOT_VIEWER_URL, 'http://38.76.188.71:3211/viewer/')
  assert.equal(env.CUA_ENV_TOKEN, undefined)
  const kept = applyCloudDefaults({ DS_BOT_SPACESD_URL: 'http://127.0.0.1:3211' })
  assert.equal(kept.DS_BOT_SPACESD_URL, 'http://127.0.0.1:3211')
})

test('the desktop sources define no login, registration, or email route', () => {
  const hits = []
  for (const name of readdirSync(SRC)) {
    if (!name.endsWith('.mjs') && !name.endsWith('.cjs') && !name.endsWith('.js')) continue
    const text = readFileSync(join(SRC, name), 'utf8')
    if (ROUTE.test(text)) hits.push(name)
  }
  assert.deepEqual(hits, [])
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SERVER, isAppServer, serverUrl } from '../src/default-server.mjs'

test('the client defaults to the shared server and has no token', () => {
  assert.equal(DEFAULT_SERVER, 'http://38.76.188.71:3080')
  assert.equal(serverUrl({}), DEFAULT_SERVER)
  assert.equal(serverUrl({ DS_BOT_SERVER: 'local' }), undefined)
  assert.equal(serverUrl({ DS_BOT_SERVER: 'http://127.0.0.1:9/' }), 'http://127.0.0.1:9')
  assert.equal(isAppServer('http://38.76.188.71:3080/chat', {}), true)
  assert.equal(isAppServer('http://38.76.188.71:3211/', {}), false)
  const text = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/default-server.mjs'), 'utf8')
  assert.equal(/api[_-]?key|mimo|CUA_ENV_TOKEN\s*[:=]\s*['"]/iu.test(text), false)
  assert.equal(/\/(login|register|signup)/u.test(text), false)
})

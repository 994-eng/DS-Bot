import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_SERVER, isAppServer, serverPage, serverUrl } from '../src/default-server.mjs'

test('the client opens the server DSH unless a local check asks otherwise', () => {
  assert.equal(serverUrl({}), DEFAULT_SERVER)
  assert.equal(serverUrl({ DS_BOT_SERVER: 'local' }), undefined)
  assert.equal(serverUrl({ DS_BOT_SERVER: 'http://10.0.0.8:3080/' }), 'http://10.0.0.8:3080')
  assert.equal(serverPage({}), 'http://38.76.188.71:3080/')
  assert.equal(isAppServer('http://38.76.188.71:3080/chat', {}), true)
  assert.equal(isAppServer('http://38.76.188.71:3211/viewer/', {}), false)
  assert.equal(isAppServer('http://127.0.0.1:9/', {}), false)
  assert.equal(isAppServer('http://38.76.188.71:3080/', { DS_BOT_SERVER: 'local' }), false)
})

test('a connection token in the override stays in the page and out of the default', () => {
  const page = serverPage({ DS_BOT_SERVER: 'http://38.76.188.71:3080/?token=desk-token' })
  assert.equal(page.includes('token=desk-token'), true)
  assert.equal(DEFAULT_SERVER.includes('token'), false)
  assert.equal(serverPage({}).includes('token'), false)
})

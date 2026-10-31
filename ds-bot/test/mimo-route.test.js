import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mimoAlready, mimoProfile, mimoRouteEnabled } from '../src/host/mimo-route.js'

test('the MiMo route names both models and only the credential name', () => {
  const profile = mimoProfile()
  assert.equal(profile.baseURL, 'https://mimo.ezlook.top/v1')
  assert.equal(profile.api, 'openai-completions')
  assert.equal(profile.apiKeyEnv, 'MIMO_API_KEY')
  assert.deepEqual(profile.models.map(model => model.id), ['mimo-v2.6-flash', 'mimo-v2.6-pro'])
  assert.equal(JSON.stringify(profile).includes('sk-'), false)
  assert.equal(mimoAlready(profile), true)
  assert.equal(mimoAlready({ baseURL: profile.baseURL }), false)
})

test('the package check does not replace its mock model with MiMo', () => {
  assert.equal(mimoRouteEnabled({}), true)
  assert.equal(mimoRouteEnabled({ DS_BOT_SERVER: 'local' }), false)
  assert.equal(mimoRouteEnabled({ DS_BOT_SERVER: 'local', DS_BOT_MIMO: '1' }), true)
  assert.equal(mimoRouteEnabled({ DS_BOT_MIMO: '0' }), false)
})

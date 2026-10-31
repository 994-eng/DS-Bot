import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createScreenDesk, requestLiveDesktop, screenRail } from '../src/client/virtual-screen.js'

const bots = [
  { id: 'chief', name: 'Chief' },
  { id: 'writer', name: 'Writer' },
]

test('clicking a Bot selects that Bot’s screen', () => {
  const rail = screenRail(bots, 'writer')
  assert.equal(rail.selectedId, 'writer')
  assert.equal(rail.items.find(item => item.selected).screenId, 'screen:writer')
  assert.equal(rail.items.find(item => item.id === 'chief').selected, false)
})

test('opening the live desktop asks the app for that Bot and sends no token', () => {
  const calls = []
  assert.equal(requestLiveDesktop({ open: (payload) => { calls.push(payload) } }, { id: 'chief', name: 'Chief' }), true)
  assert.deepEqual(calls, [{ botId: 'chief', title: 'Chief' }])
  assert.equal('token' in calls[0], false)
  assert.equal(requestLiveDesktop(undefined, { id: 'chief', name: 'Chief' }), false)
})

test('input stays on the Bot that received it', () => {
  const desk = createScreenDesk(bots)
  desk.input('writer', { type: 'pointer', x: 10, y: 12 })
  const [chief, writer] = desk.list()
  assert.equal(chief.events.length, 0)
  assert.equal(chief.status, 'idle')
  assert.equal(writer.events.length, 1)
  assert.equal(writer.status, 'active')
  assert.equal(desk.machineId, 'shared')
  writer.events.push({ type: 'pointer', x: 1, y: 1 })
  assert.equal(desk.list()[1].events.length, 1)
})

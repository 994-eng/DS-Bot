import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createScreenDesk, screenRail } from '../src/client/virtual-screen.js'

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

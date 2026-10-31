import assert from 'node:assert/strict'
import { test } from 'node:test'
import { planDesktopGoal } from '../src/plan.js'

const tree = {
  name: 'Desktop',
  children: [
    { name: 'Terminal', bounds: { x: 40, y: 40, width: 200, height: 100 } },
  ],
}

test('a named click and a type become spacesd calls', () => {
  const steps = planDesktopGoal('click "Terminal" and type "echo hi"', tree)
  assert.equal(steps[0].method, 'ComputerService/Pointer')
  assert.equal(steps[0].body.click.position.x, 140)
  assert.equal(steps[0].body.click.position.y, 90)
  assert.equal(steps[1].method, 'ComputerService/Keyboard')
  assert.equal(steps[1].body.type.text, 'echo hi')
  assert.equal(steps.at(-1).method, 'ComputerService/Screenshot')
})

test('a missing control stops the plan', () => {
  const steps = planDesktopGoal('click "Missing"', tree)
  assert.equal(steps.length, 1)
  assert.match(steps[0].error, /Missing/)
})

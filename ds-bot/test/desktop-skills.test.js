import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { desktopSkillNames, skillsRoot } from '../src/host/desktop-skills.js'

const SECRET = /CUA_ENV_TOKEN\s*[:=]\s*['"][^'"]+['"]|\bsk-[A-Za-z0-9]{20,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/

function filesUnder(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...filesUnder(path))
    else if (/\.(md|js|py)$/u.test(entry.name)) out.push(path)
  }
  return out
}

test('desktop skills exist and name EGO and CUA', () => {
  const root = skillsRoot()
  assert.ok(root)
  assert.deepEqual(desktopSkillNames(root), ['computer-use-desktop', 'desktop-browser-control'])
  for (const name of desktopSkillNames(root)) {
    const text = readFileSync(join(root, name, 'SKILL.md'), 'utf8')
    assert.match(text, /EGO/)
    assert.match(text, /CUA/)
    assert.match(text, /screenshot/i)
    assert.doesNotMatch(text, SECRET)
  }
})

test('the vendored computer-use tree is reference only and has no secret assignment', () => {
  const vendor = join(skillsRoot(), '..', 'vendor', 'lightvela-computer-use')
  const readme = readFileSync(join(vendor, 'README.md'), 'utf8')
  assert.match(readme, /does not run/)
  assert.match(readme, /not Hermes/)
  const hits = filesUnder(vendor).filter(path => SECRET.test(readFileSync(path, 'utf8')))
  assert.deepEqual(hits, [])
})

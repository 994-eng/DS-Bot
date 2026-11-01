// Desktop skills for the visual computer. DSH also loads any SKILL.md dropped
// in the profile skills directory; this provider reads the checkout's skills/
// when that directory is present, and DS_BOT_DESKTOP_SKILLS when set.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROVIDER = 'ds-bot-desktop'

export function skillsRoot(env = process.env, from = import.meta.url) {
  const configured = env.DS_BOT_DESKTOP_SKILLS
  if (typeof configured === 'string' && configured !== '' && existsSync(configured)) return configured
  const beside = join(dirname(fileURLToPath(from)), '..', '..', '..', 'skills')
  return existsSync(beside) ? beside : undefined
}

function parseSkill(raw, path) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
  const metadata = frontmatter?.[1] ? Object.fromEntries(
    frontmatter[1].split('\n').map(line => /^(\w[\w-]*):\s*(.+)$/.exec(line.trim())?.slice(1) ?? []).filter(part => part.length === 2)) : {}
  if (typeof metadata.description !== 'string' || metadata.description.length === 0) {
    throw new Error(`${PROVIDER}: ${path} has no description`)
  }
  return { description: metadata.description, content: raw.slice(frontmatter[0].length).trim() }
}

export function desktopSkillNames(root = skillsRoot()) {
  if (!root || !existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(root, entry.name, 'SKILL.md')))
    .map(entry => entry.name)
    .sort()
}

function provider(root) {
  const names = desktopSkillNames(root)
  const list = () => Promise.resolve(names.map((name, index) => {
    const directory = join(root, name)
    const locator = join(directory, 'SKILL.md')
    const { description } = parseSkill(readFileSync(locator, 'utf8'), locator)
    return {
      name, description,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: PROVIDER, source: 'bundled', rank: 520 + index,
      locator,
    }
  }))
  return {
    name: PROVIDER,
    list,
    async get(candidate) {
      const { description, content } = parseSkill(readFileSync(candidate.locator, 'utf8'), candidate.locator)
      return { ...candidate, description, content }
    },
  }
}

export function install(rt) {
  rt.ctx.inject?.({ skills: null }, (ctx) => {
    const root = skillsRoot()
    if (!root) return () => {}
    return ctx.skills.registerProvider(() => provider(root))
  })
}

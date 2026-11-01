// Writes the MiMo route into a patch overlay next to the profiles. The key is
// only the credential name MIMO_API_KEY; the value stays in the environment.
import { dirname, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
import { MIMO_BASE_URL, MIMO_DEFAULT_MODEL, MIMO_MODELS, MIMO_PROVIDER } from './mimo.mjs'

export const MIMO_PATCH_NAME = 'mimo.patch.yml'

export function mimoPatchDocument() {
  const models = MIMO_MODELS.flatMap(model => [`          - id: ${model.id}`, `            name: ${model.name}`]).join('\n')
  return [
    '- id: llm-pi-ai',
    '  name: "@deepseek-ai/dsh-llm-pi-ai"',
    '  config:',
    '    providers:',
    `      ${MIMO_PROVIDER}:`,
    '        displayName: MiMo',
    '        api: openai-completions',
    `        baseURL: ${MIMO_BASE_URL}`,
    '        apiKeyEnv: MIMO_API_KEY',
    '        models:',
    models,
    '- id: agent-default-model',
    '  name: "@deepseek-ai/dsh-agent-default-model"',
    '  config:',
    `    provider: ${MIMO_PROVIDER}`,
    `    model: ${MIMO_DEFAULT_MODEL}`,
    '',
  ].join('\n')
}

export function reconcileMimo(profile) {
  const file = join(dirname(profile.dir), MIMO_PATCH_NAME)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, mimoPatchDocument(), 'utf8')
  return [file]
}

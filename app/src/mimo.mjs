import { dirname } from 'node:path'

// MiMo is the built-in OpenAI-compatible route. The key is never written here:
// DSH reads the credential MIMO_API_KEY from the environment, and the desktop
// app copies it from a file outside this repository when the variable is unset.

export const MIMO_BASE_URL = 'https://mimo.ezlook.top/v1'
export const MIMO_PROVIDER = 'mimo'
export const MIMO_DEFAULT_MODEL = 'mimo-v2.6-flash'
export const MIMO_MODELS = [
  { id: 'mimo-v2.6-flash', name: 'MiMo v2.6 Flash' },
  { id: 'mimo-v2.6-pro', name: 'MiMo v2.6 Pro' },
]

export function mimoCredentialPaths(env = process.env, userData) {
  const paths = []
  if (typeof env.MIMO_API_KEY_FILE === 'string' && env.MIMO_API_KEY_FILE.trim() !== '') paths.push(env.MIMO_API_KEY_FILE.trim())
  if (typeof env.APPDATA === 'string' && env.APPDATA !== '') paths.push(`${env.APPDATA}/DeepSeek-Bot/credentials.json`)
  if (typeof userData === 'string' && userData !== '') paths.push(`${userData}/credentials.json`)
  return paths
}

function keyFrom(parsed) {
  const value = typeof parsed?.MIMO_API_KEY === 'string' ? parsed.MIMO_API_KEY : typeof parsed?.apiKey === 'string' ? parsed.apiKey : ''
  return value.trim()
}

// Writes the pack-time credential file. An empty key writes `{}` so the package
// still builds. The key is never logged and this file is not committed.
export function writePackedCredentials(env, { mkdirSync, writeFileSync, dest }) {
  const key = typeof env.MIMO_API_KEY === 'string' ? env.MIMO_API_KEY.trim() : ''
  const body = key === '' ? {} : { MIMO_API_KEY: key }
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, `${JSON.stringify(body)}\n`, { encoding: 'utf8', mode: 0o600 })
  return key !== ''
}

// Sets MIMO_API_KEY on `env` when a local file has one and the variable is empty.
// Returns whether a key is now present. The value is not returned.
export function applyMimoEnv(env, { readFileSync, paths = mimoCredentialPaths(env) } = {}) {
  if (typeof env.MIMO_API_KEY === 'string' && env.MIMO_API_KEY.trim() !== '') return true
  if (typeof readFileSync !== 'function') return false
  for (const path of paths) {
    let parsed
    try { parsed = JSON.parse(readFileSync(path, 'utf8')) } catch { continue }
    const key = keyFrom(parsed)
    if (key === '') continue
    env.MIMO_API_KEY = key
    return true
  }
  return false
}

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

function trimmed(env, name) {
  return typeof env?.[name] === 'string' ? env[name].trim() : ''
}

// Writes the pack-time credential file. Empty secrets write `{}` so the package
// still builds. Values are never logged and this file is not committed.
export function writePackedCredentials(env, { mkdirSync, writeFileSync, dest }) {
  const mimo = trimmed(env, 'MIMO_API_KEY')
  const cua = trimmed(env, 'CUA_ENV_TOKEN')
  const body = {}
  if (mimo !== '') body.MIMO_API_KEY = mimo
  if (cua !== '') body.CUA_ENV_TOKEN = cua
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, `${JSON.stringify(body)}\n`, { encoding: 'utf8', mode: 0o600 })
  return { mimo: mimo !== '', cua: cua !== '' }
}

// Fills MIMO_API_KEY from a credential file when that variable is empty.
// CUA_ENV_TOKEN is left for readDesktopToken, which treats the env and
// CUA_ENV_TOKEN_FILE as overrides of this same file. Returns whether a MiMo
// key is now present. The value is not returned.
export function applyMimoEnv(env, { readFileSync, paths = mimoCredentialPaths(env) } = {}) {
  if (trimmed(env, 'MIMO_API_KEY') !== '') return true
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

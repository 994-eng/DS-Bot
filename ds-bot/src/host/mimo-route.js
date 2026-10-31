// MiMo is the built-in OpenAI-compatible route. The profile names the credential
// MIMO_API_KEY. The value is the server's environment (or DSH's credential
// store). This module never contains it.

export const MIMO_BASE_URL = 'https://mimo.ezlook.top/v1'
export const MIMO_PROVIDER = 'mimo'
export const MIMO_DEFAULT_MODEL = 'mimo-v2.6-flash'
export const MIMO_MODELS = [
  { id: 'mimo-v2.6-flash', name: 'MiMo v2.6 Flash' },
  { id: 'mimo-v2.6-pro', name: 'MiMo v2.6 Pro' },
]

export function mimoProfile() {
  return {
    displayName: 'MiMo',
    api: 'openai-completions',
    baseURL: MIMO_BASE_URL,
    apiKeyEnv: 'MIMO_API_KEY',
    models: MIMO_MODELS.map(model => ({ ...model })),
  }
}

export function mimoAlready(profile) {
  const ids = new Set((profile?.models ?? []).map(model => model?.id))
  return profile?.baseURL === MIMO_BASE_URL
    && profile?.apiKeyEnv === 'MIMO_API_KEY'
    && profile?.api === 'openai-completions'
    && ids.has('mimo-v2.6-flash')
    && ids.has('mimo-v2.6-pro')
}

// The Windows package check runs the local Host and must keep its mock model.
// Everywhere else, including the server that serves DSH web, the route is on.
export function mimoRouteEnabled(env = process.env) {
  if (env.DS_BOT_MIMO === '0') return false
  if (env.DS_BOT_MIMO === '1') return true
  return env.DS_BOT_SERVER !== 'local'
}

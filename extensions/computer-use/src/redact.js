// Captures are redacted before they can become a tool result. DS-Bot still
// substitutes secret values on model requests; this layer runs first so a
// packet log does not carry the raw header into the transcript.

const HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
])

const QUERY_NAMES = new Set([
  'token',
  'access_token',
  'api_key',
  'key',
  'password',
  'secret',
  'auth',
])

const BODY_KEYS = new Set([
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'set-cookie',
])

const REDACTED = '[redacted]'

export function redactHeaders(headers) {
  const out = {}
  for (const [name, value] of Object.entries(headers ?? {})) {
    out[name] = HEADER_NAMES.has(String(name).toLowerCase()) ? REDACTED : value
  }
  return out
}

export function redactText(text, secrets = []) {
  let out = String(text ?? '')
  const known = secrets.filter(secret => typeof secret === 'string' && secret.length >= 8)
  known.sort((a, b) => b.length - a.length)
  for (const secret of known) out = out.split(secret).join(REDACTED)
  out = out.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
  return out
}

export function redactUrl(value, secrets) {
  const text = String(value ?? '')
  if (!URL.canParse(text)) return redactText(text, secrets)
  const url = new URL(text)
  for (const name of [...url.searchParams.keys()]) {
    if (QUERY_NAMES.has(name.toLowerCase())) url.searchParams.set(name, REDACTED)
  }
  return redactText(url.toString(), secrets)
}

export function redactJson(value, secrets) {
  if (Array.isArray(value)) return value.map(item => redactJson(item, secrets))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      if (BODY_KEYS.has(String(key).toLowerCase())) out[key] = REDACTED
      else out[key] = redactJson(item, secrets)
    }
    return out
  }
  if (typeof value === 'string') return redactUrl(value, secrets)
  return value
}

export function redactEntry(entry, secrets) {
  const source = entry ?? {}
  return {
    ...source,
    url: source.url === undefined ? undefined : redactUrl(source.url, secrets),
    requestHeaders: redactHeaders(source.requestHeaders),
    responseHeaders: redactHeaders(source.responseHeaders),
    requestBody: redactJson(source.requestBody, secrets),
    responseBody: redactJson(source.responseBody, secrets),
  }
}

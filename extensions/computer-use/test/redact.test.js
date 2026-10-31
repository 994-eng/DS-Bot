import assert from 'node:assert/strict'
import { test } from 'node:test'
import { redactEntry, redactHeaders, redactText, redactUrl } from '../src/redact.js'

test('authorization and cookie headers are redacted', () => {
  const headers = redactHeaders({
    Authorization: 'Bearer short-token',
    Cookie: 'session=abc',
    Accept: 'application/json',
  })
  assert.equal(headers.Authorization, '[redacted]')
  assert.equal(headers.Cookie, '[redacted]')
  assert.equal(headers.Accept, 'application/json')
})

test('secret query parameters and known values are redacted', () => {
  const url = redactUrl('https://example.com/cb?token=abcdef&q=1', [])
  assert.match(url, /token=%5Bredacted%5D|token=\[redacted\]/)
  assert.match(url, /q=1/)
  assert.equal(redactText('prefix desk-token-value suffix', ['desk-token-value']), 'prefix [redacted] suffix')
})

test('a network entry redacts headers and body keys', () => {
  const entry = redactEntry({
    url: 'https://example.com/a?api_key=zzzz',
    requestHeaders: { 'X-Api-Key': 'zzzz' },
    responseHeaders: { 'Set-Cookie': 'a=b' },
    requestBody: { password: 'hunter2', note: 'hello' },
    responseBody: 'ok',
  })
  assert.equal(entry.requestHeaders['X-Api-Key'], '[redacted]')
  assert.equal(entry.responseHeaders['Set-Cookie'], '[redacted]')
  assert.equal(entry.requestBody.password, '[redacted]')
  assert.equal(entry.requestBody.note, 'hello')
  assert.doesNotMatch(JSON.stringify(entry), /hunter2/)
})

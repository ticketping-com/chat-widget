import assert from 'node:assert/strict'
import { test } from 'node:test'
import { headersFor, isServable, LOADER_MAX_AGE } from './headers.ts'

test('serves the loader and versioned files only', () => {
  assert.ok(isServable('/v2/loader.js'))
  assert.ok(isServable('/v2/2.0.0/widget.js'))
  assert.ok(isServable('/v2/2.0.0-beta.3/chunks/emoji-abc123.js'))
  for (const path of ['/', '/v2/', '/v2/latest/widget.js', '/v2/2.0.0/../x', '/v1/widget.js']) {
    assert.equal(isServable(path), false, path)
  }
})

test('loader revalidates quickly, versioned files are immutable', () => {
  assert.match(
    headersFor('/v2/loader.js', 'text/javascript')['Cache-Control']!,
    new RegExp(`max-age=${LOADER_MAX_AGE}`)
  )
  assert.match(headersFor('/v2/2.0.0/widget.js', 'text/javascript')['Cache-Control']!, /immutable/)
})

test('cross-origin script loading is allowed and sniffing is off', () => {
  const headers = headersFor('/v2/2.0.0/widget.js', 'text/javascript')
  assert.equal(headers['Access-Control-Allow-Origin'], '*')
  assert.equal(headers['Cross-Origin-Resource-Policy'], 'cross-origin')
  assert.equal(headers['X-Content-Type-Options'], 'nosniff')
})

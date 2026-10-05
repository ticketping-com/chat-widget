// Writes spec/token-test-vectors.json. Output is deterministic (fixed clock and secrets),
// so CI can regenerate it and fail on any diff. Run: npm run spec:vectors

import { createHmac } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import {
  AUDIENCE,
  LEEWAY_SECONDS,
  MAX_LIFETIME_SECONDS,
  replayKeyOf,
  verifyToken,
  type ErrorCode,
  type Secret,
  type VerifiedClaims
} from './verify-token.ts'

const NOW = 1798761600 // 2027-01-01T00:00:00Z

const CURRENT = 'tpis_vector_current_7f3c9d2e5b8a1f4c6e0d2a9e4c7f1d6b3e8a'
const PREVIOUS = 'tpis_vector_previous_2a9e4c7f1d6b3e8a0c5f9c1e6a3f8d2b7e4c'
const REVOKED = 'tpis_vector_revoked_4e8b2d6f0a3c7e1b9d5c0a5d9c1e6a3f8d2b'
const NOT_OURS = 'tpis_vector_some_other_team_000000000000000000000000000'

const SECRETS: Secret[] = [
  { secret: CURRENT },
  { secret: PREVIOUS },
  { secret: REVOKED, revoked: true }
]

type Json = Record<string, unknown>

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

function sign(header: Json, payload: Json, secret: string): string {
  const input = `${b64(header)}.${b64(payload)}`
  const signature = createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(input)
    .digest('base64url')
  return `${input}.${signature}`
}

/** What the docs snippets produce: `{ sub, exp }` plus whatever profile claims the host adds. */
const claims = (overrides: Json = {}): Json => ({ sub: 'user_123', exp: NOW + 300, ...overrides })

const token = (payload: Json, secret = CURRENT, header: Json = {}) =>
  sign({ alg: 'HS256', typ: 'JWT', ...header }, payload, secret)

const without = (payload: Json, key: string): Json =>
  Object.fromEntries(Object.entries(payload).filter(([k]) => k !== key))

interface Case {
  name: string
  description: string
  token: string
  seen?: string[]
  expect:
    | { valid: true; claims: VerifiedClaims }
    | { valid: false; error: ErrorCode; claim?: string }
}

const cases: Case[] = []

function valid(
  name: string,
  description: string,
  tok: string,
  expected: VerifiedClaims = { sub: 'user_123' }
) {
  cases.push({ name, description, token: tok, expect: { valid: true, claims: expected } })
}

function invalid(
  name: string,
  description: string,
  tok: string,
  error: ErrorCode,
  extra: { claim?: string; seen?: string[] } = {}
) {
  cases.push({
    name,
    description,
    token: tok,
    ...(extra.seen ? { seen: extra.seen } : {}),
    expect: extra.claim ? { valid: false, error, claim: extra.claim } : { valid: false, error }
  })
}

// ---- Valid ----------------------------------------------------------------

valid(
  'valid_minimal',
  'Just sub and exp: what `jwt.sign({ sub }, secret, { expiresIn: "5m" })` gives, minus iat.',
  token(claims())
)

valid(
  'valid_library_defaults',
  'Typical library output: iat added automatically, plus a jti and kid the server ignores.',
  token(claims({ iat: NOW, jti: 'a1b2c3' }), CURRENT, { kid: 'anything' })
)

valid(
  'valid_full_profile',
  'All optional profile claims.',
  token(
    claims({
      email: 'ada@acme.com',
      name: 'Ada Lovelace',
      company: { id: 'acme', name: 'Acme Inc' },
      attributes: { plan: 'pro', seats: 12, trial: false, region: null }
    })
  ),
  {
    sub: 'user_123',
    email: 'ada@acme.com',
    name: 'Ada Lovelace',
    company: { id: 'acme', name: 'Acme Inc' },
    attributes: { plan: 'pro', seats: 12, trial: false, region: null }
  }
)

valid(
  'valid_audience',
  'aud is optional; when present it must include "ticketping".',
  token(claims({ aud: AUDIENCE }))
)
valid('valid_audience_array', '', token(claims({ aud: ['acme-api', AUDIENCE] })))
valid(
  'valid_previous_secret',
  'During a rotation, the previous secret still verifies.',
  token(claims(), PREVIOUS)
)
valid('valid_no_typ_header', 'typ is optional.', sign({ alg: 'HS256' }, claims(), CURRENT))
valid(
  'valid_max_lifetime',
  'exp exactly 10 minutes from now.',
  token(claims({ exp: NOW + MAX_LIFETIME_SECONDS }))
)
valid(
  'valid_host_clock_ahead',
  `Host clock up to ${LEEWAY_SECONDS}s ahead: iat and a 10-minute exp still pass.`,
  token(claims({ iat: NOW + 50, exp: NOW + 50 + MAX_LIFETIME_SECONDS }))
)
valid(
  'valid_expired_within_leeway',
  `Expired ${LEEWAY_SECONDS / 2}s ago: inside the clock-skew leeway.`,
  token(claims({ exp: NOW - LEEWAY_SECONDS / 2 }))
)
valid(
  'valid_extra_claims_ignored',
  'Unknown claims (iss, role, ...) are ignored, never trusted.',
  token(claims({ iss: 'https://acme.com', role: 'admin' }))
)

// ---- Shape ----------------------------------------------------------------

invalid(
  'malformed_two_segments',
  'Not three dot-separated parts.',
  token(claims()).split('.').slice(0, 2).join('.'),
  'token_malformed'
)
{
  const [h, , s] = token(claims()).split('.')
  invalid(
    'malformed_payload_not_json',
    '',
    `${h}.${Buffer.from('not json').toString('base64url')}.${s}`,
    'token_malformed'
  )
  invalid(
    'malformed_payload_array',
    'Payload must be a JSON object.',
    `${h}.${b64([1, 2])}.${s}`,
    'token_malformed'
  )
}
invalid(
  'malformed_standard_base64',
  'Segments must be base64url, not standard base64.',
  token(claims()).replace('.', '+.'),
  'token_malformed'
)
invalid(
  'token_too_large',
  'Over 4096 bytes.',
  token(claims({ attributes: { a: 'x'.repeat(1000), b: 'x'.repeat(1000), c: 'x'.repeat(1000) } })),
  'token_too_large'
)

// ---- Algorithm and signature ----------------------------------------------

invalid(
  'alg_none',
  'Unsigned tokens are rejected.',
  `${b64({ alg: 'none' })}.${b64(claims())}.`,
  'alg_not_allowed'
)
invalid('alg_hs512', 'Only HS256.', sign({ alg: 'HS512' }, claims(), CURRENT), 'alg_not_allowed')
invalid('alg_rs256', '', sign({ alg: 'RS256' }, claims(), CURRENT), 'alg_not_allowed')
invalid(
  'signature_other_secret',
  "Signed with a secret that is not this team's.",
  token(claims(), NOT_OURS),
  'signature_invalid'
)
invalid(
  'signature_revoked_secret',
  'Revoked secrets stop verifying immediately.',
  token(claims(), REVOKED),
  'signature_invalid'
)
{
  const [h, , s] = token(claims()).split('.')
  invalid(
    'signature_tampered_payload',
    'Payload changed after signing.',
    `${h}.${b64(claims({ sub: 'admin' }))}.${s}`,
    'signature_invalid'
  )
}

// ---- Claims ---------------------------------------------------------------

invalid('sub_missing', '', token(without(claims(), 'sub')), 'claim_missing', { claim: 'sub' })
invalid('sub_empty', 'Empty or whitespace only.', token(claims({ sub: '  ' })), 'claim_invalid', {
  claim: 'sub'
})
invalid(
  'sub_number',
  'Must be a string; stringify numeric IDs.',
  token(claims({ sub: 123 })),
  'claim_invalid',
  { claim: 'sub' }
)
invalid(
  'sub_too_long',
  'At most 255 characters.',
  token(claims({ sub: 'u'.repeat(256) })),
  'claim_invalid',
  { claim: 'sub' }
)
invalid(
  'exp_missing',
  'Tokens without exp would never expire.',
  token(without(claims(), 'exp')),
  'claim_missing',
  { claim: 'exp' }
)
invalid(
  'exp_string',
  'NumericDate must be a number of seconds.',
  token(claims({ exp: String(NOW + 300) })),
  'claim_invalid',
  { claim: 'exp' }
)
invalid('exp_before_iat', '', token(claims({ iat: NOW, exp: NOW - 1 })), 'claim_invalid', {
  claim: 'exp'
})
invalid('iat_string', '', token(claims({ iat: 'now' })), 'claim_invalid', { claim: 'iat' })
invalid('nbf_string', '', token(claims({ nbf: 'soon' })), 'claim_invalid', { claim: 'nbf' })
invalid(
  'aud_wrong',
  'A token minted for another service.',
  token(claims({ aud: 'acme-api' })),
  'audience_invalid'
)
invalid('email_invalid', '', token(claims({ email: 'not-an-email' })), 'claim_invalid', {
  claim: 'email'
})
invalid('name_number', '', token(claims({ name: 42 })), 'claim_invalid', { claim: 'name' })
invalid('company_without_id', '', token(claims({ company: { name: 'Acme' } })), 'claim_invalid', {
  claim: 'company'
})
invalid(
  'attributes_nested_object',
  'Values: string, number, boolean or null.',
  token(claims({ attributes: { plan: { tier: 'pro' } } })),
  'claim_invalid',
  { claim: 'attributes' }
)
invalid(
  'attributes_bad_key',
  'Keys: letters, digits, underscore; at most 64.',
  token(claims({ attributes: { 'plan-tier': 'pro' } })),
  'claim_invalid',
  { claim: 'attributes' }
)
invalid(
  'attributes_too_many',
  'At most 50 attributes.',
  token(
    claims({ attributes: Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`a${i}`, i])) })
  ),
  'claim_invalid',
  { claim: 'attributes' }
)

// ---- Time -----------------------------------------------------------------

invalid('expired', 'Expired beyond the leeway.', token(claims({ exp: NOW - 120 })), 'token_expired')
invalid(
  'iat_in_future',
  'Host clock more than 60s ahead.',
  token(claims({ iat: NOW + 120, exp: NOW + 400 })),
  'token_not_yet_valid'
)
invalid('nbf_in_future', '', token(claims({ nbf: NOW + 120 })), 'token_not_yet_valid')
invalid(
  'lifetime_too_long',
  'exp more than 10 minutes (plus leeway) away.',
  token(claims({ exp: NOW + MAX_LIFETIME_SECONDS + LEEWAY_SECONDS + 1 })),
  'lifetime_too_long'
)
invalid(
  'lifetime_24h',
  'The classic `expiresIn: "1d"` mistake.',
  token(claims({ iat: NOW, exp: NOW + 86400 })),
  'lifetime_too_long'
)
invalid(
  'exp_in_milliseconds',
  'A common bug: Date.now() instead of seconds.',
  token(claims({ exp: (NOW + 300) * 1000 })),
  'lifetime_too_long'
)

// ---- Single use -----------------------------------------------------------

{
  const used = token(claims({ email: 'replayed@acme.com' }))
  invalid('replayed', 'The same token was already accepted once.', used, 'token_replayed', {
    seen: [replayKeyOf(used)]
  })
}

// ---- Self-check and write -------------------------------------------------

for (const c of cases) {
  const result = verifyToken(c.token, { secrets: SECRETS, now: NOW, seen: new Set(c.seen) })
  const actual = result.valid ? { valid: true, claims: result.claims } : result
  if (JSON.stringify(actual) !== JSON.stringify(c.expect)) {
    throw new Error(
      `Vector "${c.name}" disagrees with the reference verifier: ${JSON.stringify(actual)}`
    )
  }
}

const output = {
  $comment:
    'Generated by spec/reference/generate-vectors.ts. Do not edit by hand. Rules: spec/protocol.md section 5.',
  now: NOW,
  audience: AUDIENCE,
  leewaySeconds: LEEWAY_SECONDS,
  maxLifetimeSeconds: MAX_LIFETIME_SECONDS,
  secrets: SECRETS,
  replayKey: 'sha256 hex of the signature segment',
  cases
}

writeFileSync(
  new URL('../token-test-vectors.json', import.meta.url),
  JSON.stringify(output, null, 2) + '\n'
)
console.warn(`Wrote ${cases.length} token test vectors.`)

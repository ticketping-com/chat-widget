import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { verifyToken, type Secret } from './verify-token.ts'

interface Vectors {
  now: number
  secrets: Secret[]
  cases: {
    name: string
    token: string
    seen?: string[]
    expect: { valid: boolean; claims?: unknown; error?: string; claim?: string }
  }[]
}

const vectors: Vectors = JSON.parse(
  readFileSync(new URL('../token-test-vectors.json', import.meta.url), 'utf8')
)

describe('token test vectors', () => {
  it('cover every error code the spec defines', () => {
    const codes = new Set(vectors.cases.flatMap((c) => (c.expect.error ? [c.expect.error] : [])))
    expect([...codes].sort()).toEqual(
      [
        'alg_not_allowed',
        'audience_invalid',
        'claim_invalid',
        'claim_missing',
        'lifetime_too_long',
        'signature_invalid',
        'token_expired',
        'token_malformed',
        'token_not_yet_valid',
        'token_replayed',
        'token_too_large'
      ].sort()
    )
  })

  it.each(vectors.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const result = verifyToken(c.token, {
      secrets: vectors.secrets,
      now: vectors.now,
      seen: new Set(c.seen)
    })
    const actual = result.valid ? { valid: true, claims: result.claims } : result
    expect(actual).toEqual(c.expect)
  })
})

// Reference implementation of the host identity token rules in spec/protocol.md section 5.
// It exists so the rules are executable: the test vectors are checked against it, and the
// backend (Python) must produce the same result for every vector. It is not shipped.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const AUDIENCE = 'ticketping'
export const LEEWAY_SECONDS = 60
export const MAX_LIFETIME_SECONDS = 600
export const MAX_TOKEN_BYTES = 4096

export interface Secret {
  secret: string
  revoked?: boolean
}

export interface VerifiedClaims {
  sub: string
  email?: string
  name?: string
  company?: { id: string; name?: string }
  attributes?: Record<string, string | number | boolean | null>
}

export type ErrorCode =
  | 'token_malformed'
  | 'token_too_large'
  | 'alg_not_allowed'
  | 'signature_invalid'
  | 'claim_missing'
  | 'claim_invalid'
  | 'audience_invalid'
  | 'token_not_yet_valid'
  | 'token_expired'
  | 'lifetime_too_long'
  | 'token_replayed'

export type VerifyResult =
  | { valid: true; replayKey: string; claims: VerifiedClaims }
  | { valid: false; error: ErrorCode; claim?: string }

export interface VerifyContext {
  /** The team's identity secrets. At most two are active, during a rotation. */
  secrets: Secret[]
  now: number
  /** Replay keys of tokens already accepted (see `replayKeyOf`). */
  seen: ReadonlySet<string>
}

const B64URL = /^[A-Za-z0-9_-]*$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const ATTRIBUTE_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/

type Json = Record<string, unknown>

/** Single use without asking hosts for a `jti`: the signature identifies the token. */
export const replayKeyOf = (token: string): string =>
  createHash('sha256')
    .update(token.slice(token.lastIndexOf('.') + 1))
    .digest('hex')

const fail = (error: ErrorCode, claim?: string): VerifyResult =>
  claim === undefined ? { valid: false, error } : { valid: false, error, claim }

function decodeSegment(segment: string): Json | undefined {
  if (!B64URL.test(segment)) return undefined
  try {
    const value: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Json)
      : undefined
  } catch {
    return undefined
  }
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isString = (v: unknown, min: number, max: number): v is string =>
  typeof v === 'string' && v.length >= min && v.length <= max && v.trim().length >= min

function signatureMatches(input: string, signature: string, secrets: Secret[]): boolean {
  const given = Buffer.from(signature, 'base64url')
  return secrets
    .filter((s) => !s.revoked)
    .some((s) => {
      const expected = createHmac('sha256', Buffer.from(s.secret, 'utf8')).update(input).digest()
      return given.length === expected.length && timingSafeEqual(given, expected)
    })
}

export function verifyToken(token: string, ctx: VerifyContext): VerifyResult {
  // 1. Shape
  if (Buffer.byteLength(token, 'utf8') > MAX_TOKEN_BYTES) return fail('token_too_large')
  const parts = token.split('.')
  if (parts.length !== 3) return fail('token_malformed')
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string]
  const header = decodeSegment(rawHeader)
  const payload = decodeSegment(rawPayload)
  if (!header || !payload || !B64URL.test(rawSignature)) return fail('token_malformed')

  // 2. Algorithm and signature. `kid` and `typ` headers are ignored.
  if (header.alg !== 'HS256') return fail('alg_not_allowed')
  if (!signatureMatches(`${rawHeader}.${rawPayload}`, rawSignature, ctx.secrets)) {
    return fail('signature_invalid')
  }

  // 3. Required claims
  const p = payload
  if (p.sub === undefined) return fail('claim_missing', 'sub')
  if (!isString(p.sub, 1, 255)) return fail('claim_invalid', 'sub')
  if (p.exp === undefined) return fail('claim_missing', 'exp')
  if (!isNumber(p.exp)) return fail('claim_invalid', 'exp')

  // 4. Optional standard claims: checked only when present
  if (p.aud !== undefined) {
    const ok = p.aud === AUDIENCE || (Array.isArray(p.aud) && p.aud.includes(AUDIENCE))
    if (!ok) return fail('audience_invalid')
  }
  if (p.iat !== undefined && (!isNumber(p.iat) || p.exp <= p.iat)) {
    return fail('claim_invalid', isNumber(p.iat) ? 'exp' : 'iat')
  }
  if (p.nbf !== undefined && !isNumber(p.nbf)) return fail('claim_invalid', 'nbf')

  // 5. Optional profile claims
  const claims: VerifiedClaims = { sub: p.sub }
  if (p.email !== undefined) {
    if (typeof p.email !== 'string' || p.email.length > 254 || !EMAIL.test(p.email)) {
      return fail('claim_invalid', 'email')
    }
    claims.email = p.email
  }
  if (p.name !== undefined) {
    if (!isString(p.name, 0, 255)) return fail('claim_invalid', 'name')
    claims.name = p.name
  }
  if (p.company !== undefined) {
    const c = p.company as Json
    const ok =
      c !== null &&
      typeof c === 'object' &&
      !Array.isArray(c) &&
      isString(c.id, 1, 255) &&
      (c.name === undefined || isString(c.name, 0, 255))
    if (!ok) return fail('claim_invalid', 'company')
    claims.company =
      c.name === undefined ? { id: c.id as string } : { id: c.id as string, name: c.name as string }
  }
  if (p.attributes !== undefined) {
    const a = p.attributes as Json
    if (a === null || typeof a !== 'object' || Array.isArray(a)) {
      return fail('claim_invalid', 'attributes')
    }
    const entries = Object.entries(a)
    const ok =
      entries.length <= 50 &&
      entries.every(
        ([key, value]) =>
          ATTRIBUTE_KEY.test(key) &&
          (value === null ||
            typeof value === 'boolean' ||
            isNumber(value) ||
            (typeof value === 'string' && value.length <= 1024))
      )
    if (!ok) return fail('claim_invalid', 'attributes')
    claims.attributes = a as NonNullable<VerifiedClaims['attributes']>
  }

  // 6. Time. Lifetime is measured from now, so `iat` isn't needed.
  const { now } = ctx
  if (isNumber(p.iat) && p.iat > now + LEEWAY_SECONDS) return fail('token_not_yet_valid')
  if (isNumber(p.nbf) && p.nbf > now + LEEWAY_SECONDS) return fail('token_not_yet_valid')
  if (now >= p.exp + LEEWAY_SECONDS) return fail('token_expired')
  if (p.exp > now + MAX_LIFETIME_SECONDS + LEEWAY_SECONDS) return fail('lifetime_too_long')

  // 7. Single use. The verifier records the key only after every other check passes.
  const replayKey = replayKeyOf(token)
  if (ctx.seen.has(replayKey)) return fail('token_replayed')

  return { valid: true, replayKey, claims }
}

import type { WidgetError } from './types.ts'

/** A protocol error (spec 1.1), or a local one such as `network_error`. `status` is 0 when no response arrived. */
export class TicketpingError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>
  /** Seconds, from `Retry-After` on `429` responses. */
  readonly retryAfter: number | null

  constructor(
    code: string,
    message: string,
    options: { status?: number; details?: Record<string, unknown>; retryAfter?: number | null } = {}
  ) {
    super(message)
    this.name = 'TicketpingError'
    this.code = code
    this.status = options.status ?? 0
    this.details = options.details ?? {}
    this.retryAfter = options.retryAfter ?? null
  }

  toJSON(): WidgetError {
    return toWidgetError(this)
  }
}

export function isTicketpingError(err: unknown, code?: string): err is TicketpingError {
  return err instanceof TicketpingError && (code === undefined || err.code === code)
}

/** Worth retrying with backoff: no response at all, or a server error. */
export function isTransient(err: unknown): boolean {
  return err instanceof TicketpingError && (err.status === 0 || err.status >= 500)
}

function isWidgetError(err: unknown): err is WidgetError {
  if (!err || typeof err !== 'object') return false
  const { code, message } = err as Record<string, unknown>
  return typeof code === 'string' && typeof message === 'string'
}

export function toWidgetError(err: unknown): WidgetError {
  if (err instanceof TicketpingError) {
    const error: WidgetError = { code: err.code, message: err.message }
    if (Object.keys(err.details).length > 0) error.details = err.details
    return error
  }
  if (isWidgetError(err)) return err
  return { code: 'unknown_error', message: err instanceof Error ? err.message : String(err) }
}

const STATUS_CODES: Record<number, string> = {
  400: 'invalid_request',
  401: 'credentials_invalid',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  429: 'rate_limited'
}

/** Parses `Retry-After` as seconds or an HTTP date. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds)
  const date = Date.parse(value)
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000))
}

/** Builds the error for a non-2xx response from its status, body text and `Retry-After` header. */
export function errorFromResponse(
  status: number,
  bodyText: string,
  retryAfterHeader: string | null
): TicketpingError {
  let parsed: { code?: unknown; message?: unknown; details?: unknown } | undefined
  try {
    const body = JSON.parse(bodyText) as { error?: typeof parsed }
    parsed = body && typeof body.error === 'object' ? body.error : undefined
  } catch {
    parsed = undefined
  }
  const code =
    typeof parsed?.code === 'string'
      ? parsed.code
      : (STATUS_CODES[status] ?? (status >= 500 ? 'server_error' : 'unknown_error'))
  const message =
    typeof parsed?.message === 'string' ? parsed.message : `Request failed with status ${status}.`
  const details =
    parsed?.details && typeof parsed.details === 'object'
      ? (parsed.details as Record<string, unknown>)
      : {}
  return new TicketpingError(code, message, {
    status,
    details,
    retryAfter: parseRetryAfter(retryAfterHeader)
  })
}

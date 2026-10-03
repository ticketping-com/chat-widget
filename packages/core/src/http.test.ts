import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTicketpingError, parseRetryAfter } from './errors.ts'
import { createApiClient, type ApiCredentials } from './http.ts'
import { createFakeEnv, flush, type FakeEnv } from './testing/fakes.ts'

let env: FakeEnv
let creds: ApiCredentials

const client = (extra: Partial<Parameters<typeof createApiClient>[0]> = {}) =>
  createApiClient({
    baseUrl: 'http://api.test/',
    clientHeader: 'widget/2.0.0 (npm)',
    platform: env.platform,
    credentials: () => creds,
    ...extra
  })

const error = (status: number, code: string, headers: Record<string, string> = {}) => ({
  status,
  body: { error: { code, message: `${code} happened`, details: { field: 'x' } } },
  headers
})

beforeEach(() => {
  vi.useFakeTimers()
  env = createFakeEnv()
  creds = { visitorToken: 'tpv_visitor', accessToken: null }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createApiClient', () => {
  it('sends the client header and the right bearer for each endpoint', async () => {
    env.route = () => ({ body: { conversations: [], nextCursor: null } })
    const api = client()

    await api.listConversations()
    creds.accessToken = 'tpa_access'
    await api.listConversations('cur_1')
    await api.identify({ profile: { email: 'a@b.co' } })
    env.route = () => ({ body: { session: {} } })
    await api.refreshSession('tpr_refresh')
    env.route = () => ({ status: 204 })
    await api.logout('tpa_access', 'tpr_refresh')

    const [visitorList, accessList, identify, refresh, logout] = env.requests
    expect(visitorList!.headers['X-Ticketping-Client']).toBe('widget/2.0.0 (npm)')
    expect(visitorList!.headers.Authorization).toBe('Bearer tpv_visitor')
    expect(visitorList!.path).toBe('/api/v2/widget/conversations?limit=20')
    expect(accessList!.headers.Authorization).toBe('Bearer tpa_access')
    expect(accessList!.path).toBe('/api/v2/widget/conversations?before=cur_1&limit=20')
    // identify always carries the visitor token (protocol 4.2)
    expect(identify!.headers.Authorization).toBe('Bearer tpv_visitor')
    // refresh carries no Authorization header (4.7)
    expect(refresh!.headers.Authorization).toBeUndefined()
    expect(refresh!.body).toEqual({ refreshToken: 'tpr_refresh' })
    expect(logout!.headers.Authorization).toBe('Bearer tpa_access')
  })

  it('boot sends no Authorization header', async () => {
    env.route = () => ({ body: { ok: true } })
    await client().boot({
      publishableKey: 'pk_x',
      page: { url: '', title: '', referrer: '' },
      locale: 'en',
      client: { version: '2', integration: 'npm' }
    })
    expect(env.requests[0]!.headers.Authorization).toBeUndefined()
    expect(env.requests[0]!.path).toBe('/api/v2/widget/boot')
  })

  it('parses protocol errors', async () => {
    env.route = () => error(404, 'not_found')
    const err = await client()
      .listMessages('cs_1')
      .catch((e: unknown) => e)
    expect(isTicketpingError(err, 'not_found')).toBe(true)
    expect(err).toMatchObject({
      status: 404,
      message: 'not_found happened',
      details: { field: 'x' }
    })
  })

  it('falls back to a code from the status when the body is not a protocol error', async () => {
    env.route = () => ({ status: 502, body: 'Bad gateway' })
    const promise = client({ maxAttempts: 1 }).listConversations()
    await expect(promise).rejects.toMatchObject({ code: 'server_error', status: 502 })
  })

  it('retries 5xx and network errors with backoff, then succeeds', async () => {
    let calls = 0
    env.route = () => {
      calls++
      if (calls === 1) return 'network-error'
      if (calls === 2) return error(503, 'server_error')
      return { body: { conversations: [], nextCursor: null } }
    }
    const promise = client().listConversations()
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(promise).resolves.toEqual({ conversations: [], nextCursor: null })
    expect(calls).toBe(3)
  })

  it('gives up after maxAttempts', async () => {
    env.route = () => 'network-error'
    const promise = client().listConversations()
    const assertion = expect(promise).rejects.toMatchObject({ code: 'network_error', status: 0 })
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
    expect(env.requests).toHaveLength(3)
  })

  it('waits out a short Retry-After on 429', async () => {
    let calls = 0
    env.route = () =>
      ++calls === 1 ? error(429, 'rate_limited', { 'Retry-After': '5' }) : { body: { ok: 1 } }
    const promise = client().saveContact('a@b.co')
    await vi.advanceTimersByTimeAsync(4_900)
    expect(calls).toBe(1)
    await vi.advanceTimersByTimeAsync(200)
    await expect(promise).resolves.toEqual({ ok: 1 })
  })

  it('surfaces a long Retry-After instead of waiting', async () => {
    env.route = () => error(429, 'rate_limited', { 'Retry-After': '120' })
    const err = await client()
      .saveContact('a@b.co')
      .catch((e: unknown) => e)
    expect(err).toMatchObject({ code: 'rate_limited', retryAfter: 120 })
    expect(env.requests).toHaveLength(1)
  })

  it('never retries identify (single-use tokens)', async () => {
    env.route = () => error(500, 'server_error')
    await expect(client().identify({ token: 'jwt' })).rejects.toMatchObject({
      code: 'server_error'
    })
    expect(env.requests).toHaveLength(1)
  })

  it('recovers credentials once on 401 and repeats the request with the new token', async () => {
    env.route = (req) =>
      req.headers.Authorization === 'Bearer tpv_new'
        ? { body: { messages: [], hasMore: false } }
        : error(401, 'credentials_invalid')
    const onCredentialsInvalid = vi.fn(async () => {
      creds.visitorToken = 'tpv_new'
      return true
    })
    await expect(client({ onCredentialsInvalid }).listMessages('cs_1')).resolves.toEqual({
      messages: [],
      hasMore: false
    })
    expect(onCredentialsInvalid).toHaveBeenCalledOnce()
  })

  it('does not loop when recovery does not help', async () => {
    env.route = () => error(401, 'credentials_invalid')
    const onCredentialsInvalid = vi.fn(async () => true)
    await expect(client({ onCredentialsInvalid }).listMessages('cs_1')).rejects.toMatchObject({
      code: 'credentials_invalid'
    })
    expect(onCredentialsInvalid).toHaveBeenCalledOnce()
    expect(env.requests).toHaveLength(2)
  })

  it('uploads with XHR, reporting progress', async () => {
    creds.accessToken = 'tpa_access'
    const progress: number[] = []
    const promise = client().upload(new Blob(['hello']), 'hello.txt', {
      onProgress: (f) => progress.push(f)
    })
    await flush()
    const xhr = env.xhrs[0]!
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('http://api.test/api/v2/widget/uploads')
    expect(xhr.headers.Authorization).toBe('Bearer tpa_access')
    expect(xhr.headers['X-Ticketping-Client']).toBe('widget/2.0.0 (npm)')
    expect((xhr.body!.get('file') as File).name).toBe('hello.txt')
    xhr.progress(2, 4)
    xhr.respond(201, { attachment: { id: 'ca_1', kind: 'file' } })
    await expect(promise).resolves.toEqual({ id: 'ca_1', kind: 'file' })
    expect(progress).toEqual([0.5, 1])
  })

  it('maps upload errors and aborts', async () => {
    const tooBig = client().upload(new Blob(['x']), 'x.bin')
    await flush()
    env.xhrs[0]!.respond(413, { error: { code: 'payload_too_large', message: 'Too big' } })
    await expect(tooBig).rejects.toMatchObject({ code: 'payload_too_large', status: 413 })

    const controller = new AbortController()
    const cancelled = client().upload(new Blob(['x']), 'x.bin', { signal: controller.signal })
    await flush()
    controller.abort()
    await expect(cancelled).rejects.toMatchObject({ code: 'aborted' })
    expect(env.xhrs[1]!.aborted).toBe(true)
  })
})

describe('parseRetryAfter', () => {
  it('reads seconds and HTTP dates', () => {
    expect(parseRetryAfter('7')).toBe(7)
    expect(parseRetryAfter(null)).toBeNull()
    expect(
      parseRetryAfter('Thu, 01 Jan 2026 00:00:10 GMT', Date.parse('2026-01-01T00:00:00Z'))
    ).toBe(10)
    expect(parseRetryAfter('soon')).toBeNull()
  })
})

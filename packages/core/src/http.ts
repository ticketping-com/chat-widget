import { backoffDelay, sleep } from './backoff.ts'
import { TicketpingError, errorFromResponse } from './errors.ts'
import type { Platform } from './platform.ts'
import type {
  AttributeValue,
  Conversation,
  FileAttachment,
  GifPage,
  Identity,
  Message,
  Session,
  WidgetConfig
} from './types.ts'

export const DEFAULT_API_URL = 'https://api.ticketping.com'
const PREFIX = '/api/v2/widget'
/** Longest `Retry-After` the client waits out by itself; longer ones surface as `rate_limited`. */
const MAX_RETRY_AFTER_SECONDS = 30

export interface ApiCredentials {
  visitorToken: string | null
  accessToken: string | null
}

export interface ApiClientOptions {
  baseUrl?: string
  /** `widget/<version> (<integration>)`, sent as `X-Ticketping-Client` (protocol 1). */
  clientHeader: string
  platform: Platform
  credentials(): ApiCredentials
  /**
   * Called once per request on `401 credentials_invalid` (protocol 2.4). Resolve `true` when
   * credentials were recovered and the request should be repeated with the new ones.
   */
  onCredentialsInvalid?(): Promise<boolean>
  /** Total attempts for retryable failures (network, 5xx, short 429). */
  maxAttempts?: number
}

export interface BootRequest {
  publishableKey: string
  visitorToken?: string
  page: { url: string; title: string; referrer: string }
  locale: string
  client: { version: string; integration: string }
}

export interface BootResponse {
  config: WidgetConfig
  visitor: { id: string; token?: string }
  identity: Identity
  conversations: Conversation[]
  unreadCount: number
}

export interface IdentifyProfile {
  email?: string
  name?: string
  company?: { id: string; name?: string }
  attributes?: Record<string, AttributeValue>
}

export interface IdentifyResponse {
  identity: Identity
  session?: Session
  conversations?: Conversation[]
  unreadCount?: number
}

export interface ConversationPage {
  conversations: Conversation[]
  nextCursor: string | null
}

export interface MessagePage {
  messages: Message[]
  hasMore: boolean
}

export interface UploadOptions {
  /** Fraction uploaded, 0 to 1. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/**
 * `bearer`: access token if held, else visitor token (protocol 2.4). `visitor`: visitor token only.
 * `{ token }`: that exact token. `none`: no `Authorization` header.
 */
type Auth = 'none' | 'visitor' | 'bearer' | { token: string }

interface RequestOptions {
  auth: Auth
  body?: unknown
  /** Retry network errors, 5xx and short 429s. */
  retry?: boolean
  /** Try `onCredentialsInvalid` on 401. */
  recover?: boolean
  signal?: AbortSignal
}

export interface ApiClient {
  /** Makes server-relative URLs (attachment downloads, protocol 3.5) absolute against the API origin. */
  resolveUrl(url: string): string
  boot(body: BootRequest): Promise<BootResponse>
  identify(body: { token: string } | { profile: IdentifyProfile }): Promise<IdentifyResponse>
  saveContact(email: string): Promise<{ identity: Identity }>
  listConversations(before?: string | null): Promise<ConversationPage>
  listMessages(conversationId: string, before?: string | null): Promise<MessagePage>
  upload(file: Blob, name: string, options?: UploadOptions): Promise<FileAttachment>
  trendingGifs(offset?: number, signal?: AbortSignal): Promise<GifPage>
  searchGifs(query: string, offset?: number, signal?: AbortSignal): Promise<GifPage>
  refreshSession(refreshToken: string): Promise<{ session: Session }>
  logout(accessToken: string, refreshToken: string): Promise<void>
}

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

function aborted(): TicketpingError {
  return new TicketpingError('aborted', 'The request was cancelled.')
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { platform, clientHeader } = options
  const baseUrl = (options.baseUrl ?? DEFAULT_API_URL).replace(/\/+$/, '')
  const maxAttempts = options.maxAttempts ?? 3

  function bearer(auth: Auth): string | null {
    if (auth === 'none') return null
    if (typeof auth === 'object') return auth.token
    const { visitorToken, accessToken } = options.credentials()
    return auth === 'visitor' ? visitorToken : (accessToken ?? visitorToken)
  }

  function headers(auth: Auth): Record<string, string> {
    const result: Record<string, string> = {
      Accept: 'application/json',
      'X-Ticketping-Client': clientHeader
    }
    const token = bearer(auth)
    if (token) result.Authorization = `Bearer ${token}`
    return result
  }

  /** Shared retry/recovery loop around one attempt. */
  async function withPolicy<T>(opts: RequestOptions, attemptOnce: () => Promise<T>): Promise<T> {
    let recovered = false
    for (let attempt = 1; ; attempt++) {
      try {
        return await attemptOnce()
      } catch (err) {
        if (!(err instanceof TicketpingError) || err.code === 'aborted') throw err
        if (opts.signal?.aborted) throw aborted()
        if (
          err.status === 401 &&
          err.code === 'credentials_invalid' &&
          opts.recover !== false &&
          opts.auth !== 'none' &&
          !recovered &&
          options.onCredentialsInvalid
        ) {
          recovered = true
          if (await options.onCredentialsInvalid()) {
            attempt--
            continue
          }
          throw err
        }
        if (opts.retry === false || attempt >= maxAttempts) throw err
        if ((err.status === 0 || err.status >= 500) && err.code !== 'gifs_unavailable') {
          await sleep(500 + backoffDelay(attempt, platform.random), opts.signal)
          continue
        }
        if (
          err.status === 429 &&
          err.retryAfter !== null &&
          err.retryAfter <= MAX_RETRY_AFTER_SECONDS
        ) {
          await sleep(err.retryAfter * 1000, opts.signal)
          continue
        }
        throw err
      }
    }
  }

  function request<T>(method: string, path: string, opts: RequestOptions): Promise<T> {
    return withPolicy(opts, async () => {
      const init: RequestInit = {
        method,
        headers: headers(opts.auth),
        credentials: 'omit',
        mode: 'cors'
      }
      if (opts.body !== undefined) {
        ;(init.headers as Record<string, string>)['Content-Type'] = 'application/json'
        init.body = JSON.stringify(opts.body)
      }
      if (opts.signal) init.signal = opts.signal
      let res: Response
      try {
        res = await platform.fetch(baseUrl + PREFIX + path, init)
      } catch {
        if (opts.signal?.aborted) throw aborted()
        throw new TicketpingError('network_error', 'Network request failed.')
      }
      if (res.status === 204) return undefined as T
      const text = await res.text().catch(() => '')
      if (!res.ok) throw errorFromResponse(res.status, text, res.headers.get('Retry-After'))
      try {
        return JSON.parse(text) as T
      } catch {
        throw new TicketpingError('invalid_response', 'The server sent an unreadable response.', {
          status: res.status
        })
      }
    })
  }

  function upload(file: Blob, name: string, opts: UploadOptions = {}): Promise<FileAttachment> {
    const policy: RequestOptions = { auth: 'bearer', retry: false }
    if (opts.signal) policy.signal = opts.signal
    return withPolicy(
      policy,
      () =>
        new Promise<FileAttachment>((resolve, reject) => {
          if (opts.signal?.aborted) return reject(aborted())
          const xhr = platform.createXhr()
          xhr.open('POST', `${baseUrl}${PREFIX}/uploads`)
          for (const [key, value] of Object.entries(headers('bearer'))) {
            xhr.setRequestHeader(key, value)
          }
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
              opts.onProgress?.(event.loaded / event.total)
            }
          }
          const onAbort = () => xhr.abort()
          opts.signal?.addEventListener('abort', onAbort, { once: true })
          const done = () => opts.signal?.removeEventListener('abort', onAbort)
          xhr.onload = () => {
            done()
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const body = JSON.parse(xhr.responseText) as { attachment: FileAttachment }
                opts.onProgress?.(1)
                resolve(body.attachment)
              } catch {
                reject(new TicketpingError('invalid_response', 'Unreadable upload response.'))
              }
            } else {
              reject(
                errorFromResponse(
                  xhr.status,
                  xhr.responseText,
                  xhr.getResponseHeader('Retry-After')
                )
              )
            }
          }
          xhr.onerror = () => {
            done()
            reject(new TicketpingError('network_error', 'Upload failed.'))
          }
          xhr.onabort = () => {
            done()
            reject(aborted())
          }
          const form = new FormData()
          form.append('file', file, name)
          xhr.send(form)
        })
    )
  }

  return {
    resolveUrl: (url) => (url.startsWith('/') && !url.startsWith('//') ? baseUrl + url : url),
    boot: (body) => request('POST', '/boot', { auth: 'none', body }),
    // Signed identify must not be repeated with the same single-use token, so no retries here.
    identify: (body) =>
      request('POST', '/identify', { auth: 'visitor', body, retry: false, recover: false }),
    saveContact: (email) =>
      request('POST', '/visitor/contact', { auth: 'bearer', body: { email } }),
    listConversations: (before) =>
      request('GET', `/conversations${query({ before, limit: 20 })}`, { auth: 'bearer' }),
    listMessages: (id, before) =>
      request(
        'GET',
        `/conversations/${encodeURIComponent(id)}/messages${query({ before, limit: 50 })}`,
        {
          auth: 'bearer'
        }
      ),
    upload,
    trendingGifs: (offset = 0, signal) =>
      request(
        'GET',
        `/gifs/trending${query({ offset })}`,
        signal ? { auth: 'bearer', signal } : { auth: 'bearer' }
      ),
    searchGifs: (q, offset = 0, signal) =>
      request(
        'GET',
        `/gifs/search${query({ q, offset })}`,
        signal ? { auth: 'bearer', signal } : { auth: 'bearer' }
      ),
    refreshSession: (refreshToken) =>
      request('POST', '/session/refresh', { auth: 'none', body: { refreshToken } }),
    logout: (accessToken, refreshToken) =>
      request('POST', '/session/logout', {
        auth: { token: accessToken },
        body: { refreshToken },
        retry: false,
        recover: false
      })
  }
}

// Test doubles for every browser global behind `Platform`. Not exported from the package.
import {
  createLocalLock,
  type Platform,
  type SocketLike,
  type StorageLike,
  type XhrLike
} from '../platform.ts'
import type { Frame } from '../socket.ts'

export class MemoryStorage implements StorageLike {
  readonly map: Map<string, string> = new Map()
  get length(): number {
    return this.map.size
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

export class FakeSocket implements SocketLike {
  readyState = 0
  readonly sent: Frame[] = []
  closedWith: number | null = null
  onopen: ((event: unknown) => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  constructor(readonly url: string) {}

  send(data: string): void {
    this.sent.push(JSON.parse(data) as Frame)
  }
  close(code = 1000): void {
    this.closedWith = code
    this.readyState = 3
  }
  /** Server side: accept the connection. */
  open(): void {
    this.readyState = 1
    this.onopen?.({})
  }
  /** Server side: push a frame. */
  push(type: string, data: Record<string, unknown> = {}, extra: Partial<Frame> = {}): void {
    this.onmessage?.({ data: JSON.stringify({ v: 1, type, data, ...extra }) })
  }
  /** Server side: close with a code. */
  serverClose(code: number): void {
    this.readyState = 3
    this.onclose?.({ code, reason: '' })
  }
  framesOf(type: string): Frame[] {
    return this.sent.filter((f) => f.type === type)
  }
  last(type: string): Frame | undefined {
    return this.framesOf(type).at(-1)
  }
}

export interface FakeRequest {
  method: string
  path: string
  url: string
  headers: Record<string, string>
  body: unknown
}

export interface FakeResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
}

export type Route = (req: FakeRequest) => FakeResponse | Promise<FakeResponse> | 'network-error'

export class FakeXhr implements XhrLike {
  status = 0
  responseText = ''
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: FormData | null = null
  responseHeaders: Record<string, string> = {}
  aborted = false
  open(method: string, url: string): void {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value
  }
  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] ?? null
  }
  send(body: FormData): void {
    this.body = body
  }
  abort(): void {
    this.aborted = true
    this.onabort?.()
  }
  progress(loaded: number, total: number): void {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent)
  }
  respond(status: number, body: unknown, headers: Record<string, string> = {}): void {
    this.status = status
    this.responseText = JSON.stringify(body)
    this.responseHeaders = headers
    this.onload?.()
  }
}

export interface FakeEnv {
  platform: Platform
  storage: MemoryStorage
  sockets: FakeSocket[]
  requests: FakeRequest[]
  xhrs: FakeXhr[]
  route: Route
  hidden: boolean
  setHidden(hidden: boolean): void
  /** Simulates another tab writing (or removing) a key, then firing the `storage` event. */
  otherTab(key: string, value: unknown): void
  goOnline(): void
  socket(): FakeSocket
  locksAvailable: boolean
}

export function createFakeEnv(
  options: { storage?: MemoryStorage; lock?: Platform['lock'] } = {}
): FakeEnv {
  const storageListeners = new Set<(key: string | null) => void>()
  const visibilityListeners = new Set<() => void>()
  const onlineListeners = new Set<() => void>()
  let id = 0
  const lock = options.lock ?? createLocalLock()

  const env: FakeEnv = {
    storage: options.storage ?? new MemoryStorage(),
    sockets: [],
    requests: [],
    xhrs: [],
    route: () => ({ status: 404, body: { error: { code: 'not_found', message: 'No route' } } }),
    hidden: false,
    locksAvailable: true,
    setHidden(hidden) {
      env.hidden = hidden
      for (const l of visibilityListeners) l()
    },
    otherTab(key, value) {
      if (value === null) env.storage.removeItem(key)
      else env.storage.setItem(key, JSON.stringify(value))
      for (const l of storageListeners) l(key)
    },
    goOnline() {
      for (const l of onlineListeners) l()
    },
    socket() {
      const last = env.sockets.at(-1)
      if (!last) throw new Error('No socket was created')
      return last
    },
    platform: {
      async fetch(url, init) {
        const parsed = new URL(url)
        const headers = { ...(init.headers as Record<string, string>) }
        const req: FakeRequest = {
          method: init.method ?? 'GET',
          path: parsed.pathname + parsed.search,
          url,
          headers,
          body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined
        }
        env.requests.push(req)
        const res = await env.route(req)
        if (res === 'network-error') throw new TypeError('Failed to fetch')
        const status = res.status ?? 200
        const text = status === 204 ? '' : JSON.stringify(res.body ?? {})
        const headerMap = new Map(
          Object.entries(res.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
        )
        return {
          ok: status >= 200 && status < 300,
          status,
          headers: { get: (name: string) => headerMap.get(name.toLowerCase()) ?? null },
          text: async () => text
        } as unknown as Response
      },
      createSocket(url) {
        const socket = new FakeSocket(url)
        env.sockets.push(socket)
        return socket
      },
      createXhr() {
        const xhr = new FakeXhr()
        env.xhrs.push(xhr)
        return xhr
      },
      storage: () => env.storage,
      onStorage(listener) {
        storageListeners.add(listener)
        return () => storageListeners.delete(listener)
      },
      lock: (name, fn) => lock(name, fn),
      isHidden: () => env.hidden,
      onVisibilityChange(listener) {
        visibilityListeners.add(listener)
        return () => visibilityListeners.delete(listener)
      },
      onOnline(listener) {
        onlineListeners.add(listener)
        return () => onlineListeners.delete(listener)
      },
      random: () => 0.5,
      uuid: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
      page: () => ({ url: 'http://localhost:5180/', title: 'Test page', referrer: '' }),
      language: () => 'en-US'
    }
  }
  return env
}

/** Lets pending promise callbacks run (several microtask turns, no timers). */
export async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

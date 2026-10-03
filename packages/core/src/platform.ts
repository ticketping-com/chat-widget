// Every browser global the core touches goes through this interface, so the core runs in Node
// tests with fakes and stays SSR-safe: nothing is read until a live widget starts.

export interface SocketLike {
  readonly readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((event: unknown) => void) | null
}

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The subset of `XMLHttpRequest` used for uploads with progress. */
export interface XhrLike {
  status: number
  responseText: string
  upload: { onprogress: ((event: ProgressEvent) => void) | null }
  onload: (() => void) | null
  onerror: (() => void) | null
  onabort: (() => void) | null
  open(method: string, url: string): void
  setRequestHeader(name: string, value: string): void
  getResponseHeader(name: string): string | null
  send(body: FormData): void
  abort(): void
}

export interface PageInfo {
  url: string
  title: string
  referrer: string
}

export interface Platform {
  fetch(url: string, init: RequestInit): Promise<Response>
  createSocket(url: string): SocketLike
  createXhr(): XhrLike
  /** `null` when storage is unavailable (blocked, sandboxed iframe, private mode quirks). */
  storage(): StorageLike | null
  /** `storage` events from other tabs. `key` is `null` when another tab called `localStorage.clear()`. */
  onStorage(listener: (key: string | null) => void): () => void
  /** Runs `fn` while holding a cross-tab lock when the browser supports Web Locks. */
  lock<T>(name: string, fn: () => Promise<T>): Promise<T>
  isHidden(): boolean
  onVisibilityChange(listener: () => void): () => void
  onOnline(listener: () => void): () => void
  random(): number
  uuid(): string
  page(): PageInfo
  language(): string
}

const noop = () => {}

/** Serializes callers per name inside one tab; the fallback when `navigator.locks` is missing. */
export function createLocalLock(): Platform['lock'] {
  const tails = new Map<string, Promise<unknown>>()
  return <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const previous = tails.get(name) ?? Promise.resolve()
    const run = previous.then(fn, fn)
    const tail = run.catch(noop)
    tails.set(name, tail)
    void tail.then(() => {
      if (tails.get(name) === tail) tails.delete(name)
    })
    return run
  }
}

export function uuidV4(random: () => number = Math.random): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(random() * 256)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Real page title while the widget is showing an unread count in `document.title`. */
let underlyingPageTitle: string | null = null

/** `null` means `document.title` is the page title again. */
export function setUnderlyingPageTitle(title: string | null): void {
  underlyingPageTitle = title
}

function listen(target: EventTarget | undefined, type: string, listener: () => void): () => void {
  if (!target) return noop
  target.addEventListener(type, listener)
  return () => target.removeEventListener(type, listener)
}

export function browserPlatform(): Platform {
  const localLock = createLocalLock()
  return {
    fetch: (url, init) => fetch(url, init),
    createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
    createXhr: () => new XMLHttpRequest() as unknown as XhrLike,
    storage() {
      try {
        return window.localStorage
      } catch {
        return null
      }
    },
    onStorage(listener) {
      const handler = (event: StorageEvent) => {
        if (event.storageArea === null || event.storageArea === window.localStorage) {
          listener(event.key)
        }
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    },
    lock(name, fn) {
      const locks = (navigator as Partial<Navigator>).locks
      if (!locks?.request) return localLock(name, fn)
      return locks.request(name, fn) as ReturnType<typeof fn>
    },
    isHidden: () => document.visibilityState === 'hidden',
    onVisibilityChange: (listener) => listen(document, 'visibilitychange', listener),
    onOnline: (listener) => listen(window, 'online', listener),
    random: Math.random,
    uuid: () => uuidV4(),
    page: () => ({
      url: location.href,
      title: underlyingPageTitle ?? document.title,
      referrer: document.referrer
    }),
    language: () => navigator.language || 'en'
  }
}

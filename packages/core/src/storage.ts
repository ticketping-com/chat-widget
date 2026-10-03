import type { Platform } from './platform.ts'
import type { StoredSession, StoredVisitor } from './types.ts'

export type StorageName = 'visitor' | 'session' | (string & {})

/**
 * `localStorage` under `tp:<publishableKey>:` (protocol 2.5). While disabled (consent pending or
 * denied) every read returns `null` and every write is dropped; `clear()` still works so that
 * `consent('denied')` can delete what an earlier grant stored.
 */
export interface WidgetStorage {
  readonly enabled: boolean
  enable(): void
  disable(): void
  readVisitor(): StoredVisitor | null
  writeVisitor(visitor: StoredVisitor | null): void
  readSession(): StoredSession | null
  writeSession(session: StoredSession | null): void
  read(name: StorageName): unknown
  write(name: StorageName, value: unknown): void
  /** Removes every key of this widget. */
  clear(): void
  /** Changes made by other tabs, by name (`visitor`, `session`, ...). Ignored while disabled. */
  onChange(listener: (name: StorageName) => void): () => void
}

const isString = (value: unknown): value is string => typeof value === 'string' && value !== ''

function asVisitor(value: unknown): StoredVisitor | null {
  const v = value as Partial<StoredVisitor> | null
  return v && isString(v.token) && typeof v.visitorId === 'string'
    ? { token: v.token, visitorId: v.visitorId }
    : null
}

function asSession(value: unknown): StoredSession | null {
  const s = value as Partial<StoredSession> | null
  return s &&
    isString(s.accessToken) &&
    isString(s.refreshToken) &&
    isString(s.accessExpiresAt) &&
    isString(s.refreshExpiresAt) &&
    typeof s.userId === 'string'
    ? {
        accessToken: s.accessToken,
        accessExpiresAt: s.accessExpiresAt,
        refreshToken: s.refreshToken,
        refreshExpiresAt: s.refreshExpiresAt,
        userId: s.userId
      }
    : null
}

export function storagePrefix(publishableKey: string): string {
  return `tp:${publishableKey}:`
}

export function createWidgetStorage(publishableKey: string, platform: Platform): WidgetStorage {
  const prefix = storagePrefix(publishableKey)
  let enabled = false

  function readRaw(name: StorageName): unknown {
    if (!enabled) return null
    try {
      const text = platform.storage()?.getItem(prefix + name)
      return text ? JSON.parse(text) : null
    } catch {
      return null
    }
  }

  function writeRaw(name: StorageName, value: unknown) {
    if (!enabled) return
    try {
      const storage = platform.storage()
      if (value === null || value === undefined) storage?.removeItem(prefix + name)
      else storage?.setItem(prefix + name, JSON.stringify(value))
    } catch {
      // Quota or security errors: the widget keeps working from memory.
    }
  }

  return {
    get enabled() {
      return enabled
    },
    enable() {
      enabled = true
    },
    disable() {
      enabled = false
    },
    readVisitor: () => asVisitor(readRaw('visitor')),
    writeVisitor: (visitor) => writeRaw('visitor', visitor),
    readSession: () => asSession(readRaw('session')),
    writeSession: (session) => writeRaw('session', session),
    read: readRaw,
    write: writeRaw,
    clear() {
      try {
        const storage = platform.storage()
        if (!storage) return
        const keys: string[] = []
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key?.startsWith(prefix)) keys.push(key)
        }
        for (const key of keys) storage.removeItem(key)
      } catch {
        // Nothing to clear when storage is inaccessible.
      }
    },
    onChange(listener) {
      return platform.onStorage((key) => {
        if (!enabled) return
        if (key === null) {
          listener('visitor')
          listener('session')
        } else if (key.startsWith(prefix)) {
          listener(key.slice(prefix.length))
        }
      })
    }
  }
}

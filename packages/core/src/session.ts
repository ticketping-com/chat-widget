import { isTicketpingError, isTransient } from './errors.ts'
import type { Platform } from './platform.ts'
import type { WidgetStorage } from './storage.ts'
import type { Session, StoredSession } from './types.ts'

/** Refresh this long before `accessExpiresAt` (protocol 6.6). */
export const REFRESH_LEAD_MS = 60_000
/** After a network or server failure, try again this much later. */
export const REFRESH_RETRY_MS = 30_000

/**
 * `refreshed`: new tokens are in place (ours or another tab's). `failed`: the refresh token is
 * dead; re-identify or fall back to anonymous. `deferred`: transient failure, retry scheduled.
 */
export type RefreshResult = 'refreshed' | 'failed' | 'deferred'

export interface SessionManagerOptions {
  platform: Platform
  storage: WidgetStorage
  /** `tp:<publishableKey>:refresh` */
  lockName: string
  refresh(refreshToken: string): Promise<{ session: Session }>
  /** New tokens arrived (own refresh or another tab's): send `auth.refresh` on the socket. */
  onTokens(session: StoredSession): void
  /** The refresh timer fired. The controller runs `refresh()` and handles `failed`. */
  onRefreshDue(): void
}

export interface SessionManager {
  current(): StoredSession | null
  /** Stores a session issued by `identify` or `refresh`, and schedules its refresh. */
  set(session: StoredSession): void
  /** Takes tokens another tab stored, without writing them back. */
  adopt(session: StoredSession): void
  /** Forgets the session in memory. Storage is left to the caller. */
  clear(): void
  expiresSoon(): boolean
  refresh(): Promise<RefreshResult>
}

const expiresAt = (session: StoredSession) => Date.parse(session.accessExpiresAt)

export function createSessionManager(options: SessionManagerOptions): SessionManager {
  const { storage } = options
  let session: StoredSession | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let inflight: Promise<RefreshResult> | null = null

  function schedule(delay?: number) {
    clearTimeout(timer)
    timer = undefined
    if (!session) return
    const wait = delay ?? Math.max(0, expiresAt(session) - REFRESH_LEAD_MS - Date.now())
    // Timers longer than ~24.8 days overflow; access tokens live 15 minutes anyway.
    timer = setTimeout(options.onRefreshDue, Math.min(wait, 2 ** 31 - 1))
  }

  function install(next: StoredSession, persist: boolean) {
    session = next
    if (persist) storage.writeSession(next)
    schedule()
  }

  const soon = (s: StoredSession) => expiresAt(s) - Date.now() <= REFRESH_LEAD_MS

  async function refreshLocked(before: StoredSession): Promise<RefreshResult> {
    // Another tab may have refreshed while this one waited for the lock.
    const stored = storage.readSession()
    if (
      stored &&
      stored.userId === before.userId &&
      stored.refreshToken !== before.refreshToken &&
      !soon(stored)
    ) {
      if (session === before) {
        install(stored, false)
        options.onTokens(stored)
      }
      return 'refreshed'
    }
    try {
      const { session: fresh } = await options.refresh(before.refreshToken)
      // Logout or a user switch happened meanwhile: don't resurrect the old session.
      if (session !== before) return 'failed'
      const next: StoredSession = { ...fresh, userId: before.userId }
      install(next, true)
      options.onTokens(next)
      return 'refreshed'
    } catch (err) {
      if (session !== before) return 'failed'
      if (isTicketpingError(err, 'refresh_token_rotated')) {
        const latest = storage.readSession()
        if (
          latest &&
          latest.userId === before.userId &&
          latest.refreshToken !== before.refreshToken
        ) {
          install(latest, false)
          options.onTokens(latest)
          return 'refreshed'
        }
        return 'failed'
      }
      if (isTransient(err) || isTicketpingError(err, 'rate_limited')) {
        schedule(REFRESH_RETRY_MS)
        return 'deferred'
      }
      return 'failed'
    }
  }

  return {
    current: () => session,
    set: (next) => install(next, true),
    adopt: (next) => install(next, false),
    clear() {
      session = null
      clearTimeout(timer)
      timer = undefined
    },
    expiresSoon: () => (session ? soon(session) : false),
    refresh() {
      const before = session
      if (!before) return Promise.resolve('failed')
      if (Date.parse(before.refreshExpiresAt) <= Date.now()) return Promise.resolve('failed')
      inflight ??= options.platform
        .lock(options.lockName, () => refreshLocked(before))
        .finally(() => {
          inflight = null
        })
      return inflight
    }
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TicketpingError } from './errors.ts'
import { createLocalLock } from './platform.ts'
import { createSessionManager, type SessionManagerOptions } from './session.ts'
import { createWidgetStorage } from './storage.ts'
import { MemoryStorage, createFakeEnv, flush } from './testing/fakes.ts'
import type { Session, StoredSession } from './types.ts'

const PK = 'pk_aaaaaaaaaaaaaaaaaaaaaaaa'
const NOW = Date.parse('2026-05-01T10:00:00.000Z')

const session = (n: number, accessInMs = 15 * 60_000): StoredSession => ({
  accessToken: `tpa_${n}`,
  accessExpiresAt: new Date(Date.now() + accessInMs).toISOString(),
  refreshToken: `tpr_${n}`,
  refreshExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  userId: 'u_1'
})

function tab(
  shared: MemoryStorage,
  lock: ReturnType<typeof createLocalLock>,
  extra: Partial<SessionManagerOptions> = {}
) {
  const env = createFakeEnv({ storage: shared, lock })
  const storage = createWidgetStorage(PK, env.platform)
  storage.enable()
  const onTokens = vi.fn()
  const onRefreshDue = vi.fn()
  const manager = createSessionManager({
    platform: env.platform,
    storage,
    lockName: `tp:${PK}:refresh`,
    refresh: vi.fn(async (): Promise<{ session: Session }> => ({ session: session(99) })),
    onTokens,
    onRefreshDue,
    ...extra
  })
  return { manager, storage, onTokens, onRefreshDue }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('session manager', () => {
  it('schedules the refresh about 60 s before access expiry', () => {
    const { manager, onRefreshDue } = tab(new MemoryStorage(), createLocalLock())
    manager.set(session(1))
    vi.advanceTimersByTime(14 * 60_000 - 1)
    expect(onRefreshDue).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onRefreshDue).toHaveBeenCalledOnce()
    expect(manager.expiresSoon()).toBe(true)
  })

  it('stores rotated tokens and reports them', async () => {
    const { manager, storage, onTokens } = tab(new MemoryStorage(), createLocalLock())
    manager.set(session(1))
    await expect(manager.refresh()).resolves.toBe('refreshed')
    expect(storage.readSession()?.refreshToken).toBe('tpr_99')
    expect(manager.current()?.userId).toBe('u_1')
    expect(onTokens).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'tpa_99' }))
  })

  it('coalesces concurrent refreshes in one tab', async () => {
    const refresh = vi.fn(async () => ({ session: session(2) }))
    const { manager } = tab(new MemoryStorage(), createLocalLock(), { refresh })
    manager.set(session(1))
    const [a, b] = await Promise.all([manager.refresh(), manager.refresh()])
    expect([a, b]).toEqual(['refreshed', 'refreshed'])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('only one of two tabs refreshes; the other adopts the stored tokens', async () => {
    const shared = new MemoryStorage()
    const lock = createLocalLock()
    let release!: () => void
    const refreshA = vi.fn(
      () =>
        new Promise<{ session: Session }>(
          (resolve) => (release = () => resolve({ session: session(2) }))
        )
    )
    const refreshB = vi.fn(async () => ({ session: session(3) }))
    const a = tab(shared, lock, { refresh: refreshA })
    const b = tab(shared, lock, { refresh: refreshB })
    const initial = session(1, 30_000)
    a.manager.set(initial)
    b.manager.adopt(initial)

    const first = a.manager.refresh()
    const second = b.manager.refresh()
    await flush()
    release()

    await expect(first).resolves.toBe('refreshed')
    await expect(second).resolves.toBe('refreshed')
    expect(refreshB).not.toHaveBeenCalled()
    expect(b.manager.current()?.refreshToken).toBe('tpr_2')
    expect(b.onTokens).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'tpa_2' }))
  })

  it('on 409 refresh_token_rotated re-reads storage and uses what another tab stored', async () => {
    const shared = new MemoryStorage()
    const other = tab(shared, createLocalLock())
    const refresh = vi.fn(async () => {
      // Another tab without Web Locks rotated first and stored its result.
      other.storage.writeSession(session(7))
      throw new TicketpingError('refresh_token_rotated', 'rotated', { status: 409 })
    })
    const { manager, onTokens } = tab(shared, createLocalLock(), { refresh })
    manager.set(session(1))
    await expect(manager.refresh()).resolves.toBe('refreshed')
    expect(manager.current()?.refreshToken).toBe('tpr_7')
    expect(onTokens).toHaveBeenCalled()
  })

  it('reports failed on 409 with nothing new in storage, and on 401', async () => {
    const rotated = tab(new MemoryStorage(), createLocalLock(), {
      refresh: async () => {
        throw new TicketpingError('refresh_token_rotated', 'rotated', { status: 409 })
      }
    })
    rotated.manager.set(session(1))
    await expect(rotated.manager.refresh()).resolves.toBe('failed')

    const revoked = tab(new MemoryStorage(), createLocalLock(), {
      refresh: async () => {
        throw new TicketpingError('credentials_invalid', 'revoked', { status: 401 })
      }
    })
    revoked.manager.set(session(1))
    await expect(revoked.manager.refresh()).resolves.toBe('failed')
  })

  it('defers on network failure and tries again in 30 s', async () => {
    const { manager, onRefreshDue } = tab(new MemoryStorage(), createLocalLock(), {
      refresh: async () => {
        throw new TicketpingError('network_error', 'offline')
      }
    })
    manager.set(session(1))
    await expect(manager.refresh()).resolves.toBe('deferred')
    vi.advanceTimersByTime(30_000)
    expect(onRefreshDue).toHaveBeenCalledOnce()
  })

  it('drops a refresh result that arrives after logout', async () => {
    let release!: () => void
    const { manager, storage } = tab(new MemoryStorage(), createLocalLock(), {
      refresh: () => new Promise((resolve) => (release = () => resolve({ session: session(5) })))
    })
    manager.set(session(1))
    const result = manager.refresh()
    await flush()
    manager.clear()
    storage.writeSession(null)
    release()
    await expect(result).resolves.toBe('failed')
    expect(manager.current()).toBeNull()
    expect(storage.readSession()).toBeNull()
  })

  it('fails without calling the server when the refresh token expired', async () => {
    const refresh = vi.fn()
    const { manager } = tab(new MemoryStorage(), createLocalLock(), { refresh })
    manager.adopt({ ...session(1), refreshExpiresAt: new Date(NOW - 1).toISOString() })
    await expect(manager.refresh()).resolves.toBe('failed')
    expect(refresh).not.toHaveBeenCalled()
  })
})

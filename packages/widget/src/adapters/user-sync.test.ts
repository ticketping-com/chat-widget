import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TicketpingApi } from '../api.ts'
import { createUserSync, type GetToken } from './user-sync.ts'

function fakeApi() {
  return {
    identify: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined)
  } as unknown as TicketpingApi & {
    identify: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
  }
}

describe('createUserSync', () => {
  let api: ReturnType<typeof fakeApi>
  let getToken: GetToken

  beforeEach(() => {
    api = fakeApi()
    getToken = async () => 'jwt'
  })

  it('does nothing while auth is loading', () => {
    createUserSync(api, () => getToken).sync(undefined)
    expect(api.identify).not.toHaveBeenCalled()
    expect(api.logout).not.toHaveBeenCalled()
  })

  it('accepts host `id` as userId and signs when getToken is set', () => {
    createUserSync(api, () => getToken).sync({ id: 42, email: 'ada@acme.com', name: 'Ada' })
    expect(api.identify).toHaveBeenCalledTimes(1)
    const options = api.identify.mock.calls[0]?.[0]
    expect(options?.userId).toBe('42')
    expect(options?.email).toBe('ada@acme.com')
    expect(typeof options?.getToken).toBe('function')
  })

  it('skips a repeat identify for the same signed user', () => {
    const sync = createUserSync(api, () => getToken)
    sync.sync({ userId: 'u_1', name: 'Ada' })
    sync.sync({ userId: 'u_1', name: 'Ada Lovelace' })
    expect(api.identify).toHaveBeenCalledTimes(1)
  })

  it('logs out only after a previous identify', () => {
    const sync = createUserSync(api, () => getToken)
    sync.sync(null)
    expect(api.logout).not.toHaveBeenCalled()
    sync.sync({ userId: 'u_1' })
    sync.sync(null)
    expect(api.logout).toHaveBeenCalledTimes(1)
  })
})

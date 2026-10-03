import { describe, expect, it, vi } from 'vitest'
import { createWidgetStorage } from './storage.ts'
import { createFakeEnv } from './testing/fakes.ts'

const PK = 'pk_aaaaaaaaaaaaaaaaaaaaaaaa'
const visitor = { token: 'tpv_1', visitorId: 'vi_1' }
const session = {
  accessToken: 'tpa_1',
  accessExpiresAt: '2030-01-01T00:00:00.000Z',
  refreshToken: 'tpr_1',
  refreshExpiresAt: '2030-02-01T00:00:00.000Z',
  userId: 'u_1'
}

describe('createWidgetStorage', () => {
  it('namespaces keys by publishable key (protocol 2.5)', () => {
    const env = createFakeEnv()
    const storage = createWidgetStorage(PK, env.platform)
    storage.enable()
    storage.writeVisitor(visitor)
    storage.writeSession(session)
    expect(JSON.parse(env.storage.getItem(`tp:${PK}:visitor`)!)).toEqual(visitor)
    expect(JSON.parse(env.storage.getItem(`tp:${PK}:session`)!)).toEqual(session)
    expect(storage.readVisitor()).toEqual(visitor)
    expect(storage.readSession()).toEqual(session)
  })

  it('reads and writes nothing while disabled (consent pending)', () => {
    const env = createFakeEnv()
    env.storage.setItem(`tp:${PK}:visitor`, JSON.stringify(visitor))
    const getItem = vi.spyOn(env.storage, 'getItem')
    const storage = createWidgetStorage(PK, env.platform)

    expect(storage.readVisitor()).toBeNull()
    storage.writeSession(session)
    expect(getItem).not.toHaveBeenCalled()
    expect(env.storage.getItem(`tp:${PK}:session`)).toBeNull()
  })

  it("clear() removes only this widget's keys, even while disabled", () => {
    const env = createFakeEnv()
    env.storage.setItem(`tp:${PK}:visitor`, '{}')
    env.storage.setItem(`tp:${PK}:emoji-recent`, '[]')
    env.storage.setItem('tp:pk_other:visitor', '{}')
    env.storage.setItem('host-app', '1')
    createWidgetStorage(PK, env.platform).clear()
    expect([...env.storage.map.keys()]).toEqual(['tp:pk_other:visitor', 'host-app'])
  })

  it('ignores malformed values', () => {
    const env = createFakeEnv()
    const storage = createWidgetStorage(PK, env.platform)
    storage.enable()
    env.storage.setItem(`tp:${PK}:visitor`, 'not json')
    env.storage.setItem(`tp:${PK}:session`, JSON.stringify({ accessToken: 1 }))
    expect(storage.readVisitor()).toBeNull()
    expect(storage.readSession()).toBeNull()
  })

  it('survives a storage that throws', () => {
    const env = createFakeEnv()
    vi.spyOn(env.storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    const storage = createWidgetStorage(PK, env.platform)
    storage.enable()
    expect(() => storage.writeVisitor(visitor)).not.toThrow()
  })

  it('reports changes from other tabs for its own keys only, and only when enabled', () => {
    const env = createFakeEnv()
    const storage = createWidgetStorage(PK, env.platform)
    const names: string[] = []
    storage.onChange((name) => names.push(name))

    env.otherTab(`tp:${PK}:session`, session)
    storage.enable()
    env.otherTab(`tp:${PK}:session`, session)
    env.otherTab('tp:pk_other:session', session)
    env.otherTab(`tp:${PK}:visitor`, null)

    expect(names).toEqual(['session', 'visitor'])
  })
})

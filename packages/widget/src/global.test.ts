import { describe, expect, it, vi } from 'vitest'
import type { TicketpingApi } from './api.ts'
import { createGlobal, replayQueue, type QueueStub } from './global.ts'

function fakeApi() {
  const calls: string[] = []
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}:${JSON.stringify(args)}`)
    }
  const api = {
    version: '0.0.0',
    init: record('init'),
    on: record('on'),
    open: record('open'),
    close: record('close')
  }
  return { api: api as unknown as TicketpingApi, calls }
}

describe('createGlobal', () => {
  it('supports both call styles', () => {
    const { api, calls } = fakeApi()
    const global = createGlobal(api)

    global('open')
    global.close()

    expect(calls).toEqual(['open:[]', 'close:[]'])
  })

  it('reports unknown methods instead of throwing', () => {
    const { api } = fakeApi()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(createGlobal(api) as unknown as (m: string) => void)('nope')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"nope"'))
    spy.mockRestore()
  })
})

describe('replayQueue', () => {
  it('runs subscriptions, then init, then the rest in order', () => {
    const { api, calls } = fakeApi()
    const stub = Object.assign(() => {}, {
      q: [['open'], ['init', { publishableKey: 'pk_x' }], ['on', 'ready'], ['close']]
    }) as QueueStub

    replayQueue(createGlobal(api), stub)

    expect(calls).toEqual([
      'on:["ready"]',
      'init:[{"publishableKey":"pk_x"}]',
      'open:[]',
      'close:[]'
    ])
  })

  it('keeps consent in its queued order relative to init', () => {
    const { api, calls } = fakeApi()
    Object.assign(api, { consent: (s: string) => calls.push(`consent:${s}`) })
    const stub = Object.assign(() => {}, {
      q: [['open'], ['consent', 'pending'], ['init', {}], ['consent', 'granted']]
    }) as QueueStub

    replayQueue(createGlobal(api), stub)

    expect(calls).toEqual(['consent:pending', 'init:[{}]', 'consent:granted', 'open:[]'])
  })
})

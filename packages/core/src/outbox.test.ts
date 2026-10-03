import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOutbox, type OutboxOptions } from './outbox.ts'
import type { Frame } from './socket.ts'

let open: boolean
let sent: Omit<Frame, 'v'>[]
let failed: [string, string][]
let timeouts: number

const make = (extra: Partial<OutboxOptions> = {}) =>
  createOutbox({
    send: (frame) => {
      if (!open) return false
      sent.push(frame)
      return true
    },
    onFailed: (clientId, error) => failed.push([clientId, error.code]),
    onAckTimeout: () => timeouts++,
    ...extra
  })

const message = (clientId: string, conversationId: string | null = 'cs_1') => ({
  clientId,
  conversationId,
  text: clientId,
  attachmentIds: []
})

beforeEach(() => {
  vi.useFakeTimers()
  open = true
  sent = []
  failed = []
  timeouts = 0
})
afterEach(() => vi.useRealTimers())

describe('createOutbox', () => {
  it('sends message.send frames with the clientId as frame id', () => {
    const outbox = make()
    outbox.add({ ...message('a'), gif: { provider: 'giphy', id: 'g1' } })
    outbox.flush()
    expect(sent).toEqual([
      {
        type: 'message.send',
        id: 'a',
        data: {
          clientId: 'a',
          conversationId: 'cs_1',
          body: { text: 'a' },
          attachmentIds: [],
          gif: { provider: 'giphy', id: 'g1' }
        }
      }
    ])
  })

  it('waits while the socket is closed and sends on flush', () => {
    open = false
    const outbox = make()
    outbox.add(message('a'))
    outbox.flush()
    expect(sent).toHaveLength(0)
    open = true
    outbox.flush()
    expect(sent).toHaveLength(1)
  })

  it('re-sends after an ack timeout and fails after 3 attempts (protocol 6.3)', () => {
    const outbox = make()
    outbox.add(message('a'))
    outbox.flush()
    for (let attempt = 1; attempt <= 2; attempt++) {
      vi.advanceTimersByTime(10_000)
      expect(timeouts).toBe(attempt)
      outbox.flush() // the next connection
    }
    expect(sent).toHaveLength(3)
    vi.advanceTimersByTime(10_000)
    expect(failed).toEqual([['a', 'delivery_failed']])
    outbox.flush()
    expect(sent).toHaveLength(3)
    expect(outbox.size).toBe(0)
  })

  it('counts a drop before the ack as an attempt and re-sends on reconnect', () => {
    const outbox = make()
    outbox.add(message('a'))
    outbox.flush()
    outbox.disconnected()
    outbox.flush()
    expect(sent.map((f) => f.data.clientId)).toEqual(['a', 'a'])
    vi.advanceTimersByTime(9_999)
    expect(timeouts).toBe(0)
  })

  it('holds follow-ups to a new conversation until the first ack names it', () => {
    const outbox = make()
    outbox.add(message('first', null))
    outbox.add(message('second', null))
    outbox.add(message('elsewhere', 'cs_9'))
    outbox.flush()
    expect(sent.map((f) => f.data.clientId)).toEqual(['first', 'elsewhere'])

    const acked = outbox.ack('first', 'cs_new')
    expect(acked?.conversationId).toBeNull()
    expect(sent.at(-1)).toMatchObject({ data: { clientId: 'second', conversationId: 'cs_new' } })
  })

  it('lets the next new-conversation message start it when the first one fails', () => {
    const outbox = make()
    outbox.add(message('first', null))
    outbox.add(message('second', null))
    outbox.flush()
    outbox.reject('first', { code: 'invalid_request', message: 'bad' })
    expect(failed).toEqual([['first', 'invalid_request']])
    expect(sent.at(-1)).toMatchObject({ data: { clientId: 'second', conversationId: null } })
  })

  it('retries a failed message from scratch, and ignores unknown acks', () => {
    const outbox = make()
    outbox.add(message('a'))
    outbox.flush()
    outbox.reject('a', { code: 'rate_limited', message: 'slow down' })
    expect(outbox.retry('a')).toBe(true)
    expect(sent).toHaveLength(2)
    expect(outbox.ack('nope', 'cs_1')).toBeUndefined()
    expect(outbox.ack('a', 'cs_1')?.clientId).toBe('a')
    expect(outbox.ack('a', 'cs_1')).toBeUndefined()
    expect(outbox.has('a')).toBe(false)
  })
})

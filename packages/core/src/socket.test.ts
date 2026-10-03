import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSocketTransport, type TransportOptions, type TransportStatus } from './socket.ts'
import { createFakeEnv, flush, type FakeEnv } from './testing/fakes.ts'

let env: FakeEnv
let pending: boolean
let statuses: TransportStatus[]
let frames: string[]
let authOk: Record<string, unknown>[]
let fatal: string[]
let disconnects: number

const make = (extra: Partial<TransportOptions> = {}) =>
  createSocketTransport({
    platform: env.platform,
    url: () => 'ws://api.test/ws/v2/widget/',
    heartbeatSeconds: () => 25,
    auth: () => ({ publishableKey: 'pk_x', visitorToken: 'tpv_1' }),
    onAuthOk: (data) => authOk.push(data),
    onFrame: (frame) => frames.push(frame.type),
    onStatus: (s) => statuses.push(s),
    onDisconnect: () => disconnects++,
    onFatal: (e) => fatal.push(e.code),
    recover: async () => true,
    hasPending: () => pending,
    ...extra
  })

/** Opens the newest socket and answers its auth frame. */
function accept(cursor = 'c1') {
  const socket = env.socket()
  socket.open()
  socket.push('auth.ok', { visitorId: 'vi_1', identity: { state: 'anonymous' }, cursor })
  return socket
}

beforeEach(() => {
  vi.useFakeTimers()
  env = createFakeEnv()
  pending = false
  statuses = []
  frames = []
  authOk = []
  fatal = []
  disconnects = 0
})
afterEach(() => vi.useRealTimers())

describe('socket transport', () => {
  it('authenticates with the first frame and carries no credentials in the URL', () => {
    const transport = make({
      auth: () => ({ publishableKey: 'pk_x', visitorToken: 'tpv_1', accessToken: 'tpa_1' })
    })
    transport.start()
    const socket = env.socket()
    expect(socket.url).toBe('ws://api.test/ws/v2/widget/')
    socket.open()
    expect(socket.sent).toEqual([
      {
        v: 1,
        type: 'auth',
        data: { publishableKey: 'pk_x', visitorToken: 'tpv_1', accessToken: 'tpa_1' }
      }
    ])
    expect(transport.status).toBe('authenticating')
    socket.push('auth.ok', { cursor: 'c9' })
    expect(transport.status).toBe('open')
    expect(transport.cursor).toBe('c9')
    expect(authOk).toHaveLength(1)
  })

  it('sends nothing but auth before auth.ok, and ignores server frames before it', () => {
    const transport = make()
    transport.start()
    const socket = env.socket()
    socket.open()
    expect(transport.send({ type: 'typing', data: {} })).toBe(false)
    socket.push('message.created', { message: {} }, { cursor: 'c5' })
    expect(frames).toEqual([])
    expect(socket.sent.map((f) => f.type)).toEqual(['auth'])
  })

  it('tracks the replay cursor and resumes from it (protocol 6.4)', () => {
    const transport = make()
    transport.start()
    const first = accept('c1')
    first.push('message.created', { message: {} }, { cursor: 'c2' })
    first.push('typing', { conversationId: 'cs_1' })
    expect(transport.cursor).toBe('c2')
    expect(frames).toEqual(['message.created', 'typing'])

    first.serverClose(1001)
    vi.advanceTimersByTime(1000)
    const second = env.socket()
    second.open()
    expect(second.sent[0]!.data.resumeFrom).toBe('c2')
  })

  it('pings every heartbeatSeconds and reconnects without a pong within 10 s', () => {
    const transport = make()
    transport.start()
    const socket = accept()
    vi.advanceTimersByTime(25_000)
    expect(socket.framesOf('ping')).toHaveLength(1)
    socket.push('pong')
    vi.advanceTimersByTime(25_000)
    expect(socket.framesOf('ping')).toHaveLength(2)
    vi.advanceTimersByTime(10_000)
    expect(socket.closedWith).toBe(1000)
    expect(transport.status).toBe('waiting')
    expect(disconnects).toBe(1)
    vi.advanceTimersByTime(1_000)
    expect(env.sockets).toHaveLength(2)
  })

  it('backs off with full jitter, capped at 30 s, and resets after 60 s up', () => {
    const delays: number[] = []
    env.platform.random = () => 0.999
    const transport = make({ heartbeatSeconds: () => 600 })
    transport.start()
    for (let i = 0; i < 8; i++) {
      env.socket().serverClose(1006)
      const before = env.sockets.length
      let waited = 0
      while (env.sockets.length === before) {
        vi.advanceTimersByTime(100)
        waited += 100
      }
      delays.push(waited)
    }
    expect(delays).toEqual([500, 1000, 2000, 4000, 8000, 16000, 30000, 30000])

    accept()
    vi.advanceTimersByTime(60_000)
    env.socket().serverClose(1000)
    vi.advanceTimersByTime(500)
    expect(env.sockets).toHaveLength(10)
    expect(transport.status).toBe('connecting')
  })

  it('stops on 4003 and emits an error', () => {
    const transport = make()
    transport.start()
    env.socket().serverClose(4003)
    vi.advanceTimersByTime(60_000)
    expect(env.sockets).toHaveLength(1)
    expect(transport.status).toBe('stopped')
    expect(fatal).toEqual(['connection_refused'])
  })

  it('reconnects once after 4000, then stops if it repeats', () => {
    make().start()
    env.socket().serverClose(4000)
    vi.advanceTimersByTime(1_000)
    expect(env.sockets).toHaveLength(2)
    env.socket().serverClose(4000)
    vi.advanceTimersByTime(60_000)
    expect(env.sockets).toHaveLength(2)
    expect(fatal).toEqual(['protocol_error'])
  })

  it('recovers credentials on 4004 and 4011 before reconnecting', async () => {
    const recover = vi.fn(async () => true)
    make({ recover }).start()
    accept()
    env.socket().serverClose(4011)
    await flush()
    expect(recover).toHaveBeenLastCalledWith('access_expired', 1)
    vi.advanceTimersByTime(0)
    expect(env.sockets).toHaveLength(2)

    env.socket().serverClose(4004)
    await flush()
    expect(recover).toHaveBeenLastCalledWith('credentials_invalid', 1)
    vi.advanceTimersByTime(0)
    env.socket().serverClose(4004)
    await flush()
    expect(recover).toHaveBeenLastCalledWith('credentials_invalid', 2)
  })

  it('stays down when recovery fails', async () => {
    make({ recover: async () => false }).start()
    env.socket().serverClose(4004)
    await flush()
    vi.advanceTimersByTime(60_000)
    expect(env.sockets).toHaveLength(1)
    expect(fatal).toEqual(['session_lost'])
  })

  it('waits at least 30 s after 4029, and at most 2 s after 4100', () => {
    env.platform.random = () => 0.999
    make().start()
    accept()
    env.socket().serverClose(4029)
    vi.advanceTimersByTime(29_999)
    expect(env.sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(env.sockets).toHaveLength(2)

    accept()
    env.socket().serverClose(4100)
    vi.advanceTimersByTime(1_998)
    expect(env.sockets).toHaveLength(3)
  })

  it('does not reconnect while hidden unless a message is queued (protocol 6.7)', () => {
    const transport = make()
    transport.start()
    accept()
    env.setHidden(true)
    env.socket().serverClose(1006)
    vi.advanceTimersByTime(60_000)
    expect(env.sockets).toHaveLength(1)

    pending = true
    transport.wake()
    expect(env.sockets).toHaveLength(2)
    env.socket().serverClose(1006)
    pending = false
    vi.advanceTimersByTime(60_000)
    expect(env.sockets).toHaveLength(2)

    env.setHidden(false)
    expect(env.sockets).toHaveLength(3)
  })

  it('reconnects immediately on reconnect() and when the browser comes online', () => {
    const transport = make()
    transport.start()
    const first = accept()
    transport.reconnect()
    expect(first.closedWith).toBe(1000)
    expect(env.sockets).toHaveLength(2)
    expect(disconnects).toBe(1)

    env.socket().serverClose(1006)
    env.goOnline()
    expect(env.sockets).toHaveLength(3)
  })

  it('stop() closes the socket and ignores its late events', () => {
    const transport = make()
    transport.start()
    const socket = accept()
    transport.stop()
    expect(socket.closedWith).toBe(1000)
    socket.push('message.created', {})
    socket.serverClose(1006)
    vi.advanceTimersByTime(60_000)
    expect(env.sockets).toHaveLength(1)
    expect(frames).toEqual([])
    expect(transport.status).toBe('idle')
  })

  it('waits for credentials instead of connecting without them', () => {
    let auth: { publishableKey: string; visitorToken: string } | null = null
    const transport = make({ auth: () => auth })
    transport.start()
    expect(env.sockets).toHaveLength(0)
    expect(transport.status).toBe('waiting')
    auth = { publishableKey: 'pk_x', visitorToken: 'tpv_1' }
    transport.wake()
    expect(env.sockets).toHaveLength(1)
  })
})

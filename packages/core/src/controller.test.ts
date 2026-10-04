import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWidgetController, type WidgetController } from './controller.ts'
import { createLocalLock } from './platform.ts'
import { NEW_CONVERSATION } from './state.ts'
import { PK, conversation, installBackend, message, type FakeBackend } from './testing/backend.ts'
import {
  MemoryStorage,
  createFakeEnv,
  flush,
  type FakeEnv,
  type FakeSocket
} from './testing/fakes.ts'
import type { InitOptions, StoredSession, WidgetEvents } from './types.ts'

const NOW = Date.parse('2026-05-01T10:00:00.000Z')
const VISITOR_KEY = `tp:${PK}:visitor`
const SESSION_KEY = `tp:${PK}:session`

let env: FakeEnv
let backend: FakeBackend
let widget: WidgetController
let seen: { name: keyof WidgetEvents; payload: unknown }[]

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await flush()
    await vi.advanceTimersByTimeAsync(0)
  }
}

function make(target: FakeEnv = env): WidgetController {
  const controller = createWidgetController({
    version: '2.0.0',
    integration: 'test',
    platform: target.platform
  })
  for (const name of [
    'ready',
    'open',
    'close',
    'messageSent',
    'messageReceived',
    'conversationStarted',
    'unreadCountChange',
    'identityChange',
    'error'
  ] as const) {
    controller.events.on(name, (payload) => seen.push({ name, payload }))
  }
  return controller
}

/** Accepts the newest socket and returns it. */
function accept(socket: FakeSocket = env.socket(), cursor = 'c1'): FakeSocket {
  socket.open()
  const auth = socket.sent[0]!.data
  const verified = typeof auth.accessToken === 'string'
  socket.push('auth.ok', {
    visitorId: 'vi_1',
    identity: verified
      ? { state: 'verified', userId: 'u_1', name: 'Ada', email: 'ada@acme.com', contactEmail: null }
      : { state: 'anonymous', userId: null, name: null, email: null, contactEmail: null },
    cursor
  })
  return socket
}

async function start(options: Partial<InitOptions> = {}): Promise<FakeSocket> {
  widget.init({ publishableKey: PK, apiUrl: 'http://api.test', ...options })
  await settle()
  return accept()
}

function storeSession(session: StoredSession, visitorToken = 'tpv_known') {
  backend.visitors.add(visitorToken)
  env.storage.setItem(VISITOR_KEY, JSON.stringify({ token: visitorToken, visitorId: 'vi_1' }))
  env.storage.setItem(SESSION_KEY, JSON.stringify(session))
}

const events = (name: keyof WidgetEvents) =>
  seen.filter((e) => e.name === name).map((e) => e.payload)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  env = createFakeEnv()
  backend = installBackend(env)
  seen = []
  widget = make()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  widget.destroy()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('boot and socket', () => {
  it('boots, stores the visitor, resolves config and connects with first-frame auth', async () => {
    const socket = await start({ appearance: { accentColor: '#ff0000' } })

    const [boot] = backend.calls('/boot')
    expect(boot!.body).toEqual({
      publishableKey: PK,
      page: { url: 'http://localhost:5180/', title: 'Test page', referrer: '' },
      locale: 'en-US',
      client: { version: '2.0.0', integration: 'test' }
    })
    expect(boot!.headers['X-Ticketping-Client']).toBe('widget/2.0.0 (test)')
    expect(JSON.parse(env.storage.getItem(VISITOR_KEY)!)).toEqual({
      token: 'tpv_1',
      visitorId: 'vi_1'
    })

    const state = widget.getState()
    expect(state.status).toBe('ready')
    expect(state.config.appearance.accentColor).toBe('#ff0000')
    expect(state.config.appearance.colorMode).toBe('light')
    expect(state.config.team.name).toBe('Acme')
    expect(state.i18n.t('greetingTitle')).toBe('Hi there 👋')
    expect(state.i18n.t('greetingBody')).toBe('How can we help you?')
    expect(state.connection).toBe('online')
    expect(socket.url).toBe('ws://api.test/ws/v2/widget/')
    expect(socket.sent[0]).toEqual({
      v: 1,
      type: 'auth',
      data: { publishableKey: PK, visitorToken: 'tpv_1' }
    })
    expect(events('ready')).toHaveLength(1)
  })

  it('reuses a stored visitor token', async () => {
    backend.visitors.add('tpv_known')
    env.storage.setItem(VISITOR_KEY, JSON.stringify({ token: 'tpv_known', visitorId: 'vi_1' }))
    await start()
    expect(backend.calls('/boot')[0]!.body).toMatchObject({ visitorToken: 'tpv_known' })
    expect(env.socket().sent[0]!.data.visitorToken).toBe('tpv_known')
  })

  it('stays hidden and reports a bad key or a refused origin', async () => {
    backend.override = (req) =>
      req.path.includes('/boot')
        ? {
            status: 403,
            body: { error: { code: 'origin_not_allowed', message: 'Origin not allowed' } }
          }
        : undefined
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await settle()
    expect(widget.getState().status).toBe('failed')
    expect(events('error')).toEqual([{ code: 'origin_not_allowed', message: 'Origin not allowed' }])
    expect(env.sockets).toHaveLength(0)
  })

  it('rejects a malformed publishable key without touching the network', async () => {
    widget.init({ publishableKey: 'tp_nope' })
    await settle()
    expect(events('error')).toEqual([expect.objectContaining({ code: 'invalid_publishable_key' })])
    expect(env.requests).toHaveLength(0)
  })

  it('retries a boot that fails with a network error', async () => {
    let fail = true
    backend.override = (req) => (req.path.includes('/boot') && fail ? 'network-error' : undefined)
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(widget.getState().status).toBe('booting')
    fail = false
    await vi.advanceTimersByTimeAsync(10_000)
    expect(widget.getState().status).toBe('ready')
  })
})

describe('consent (protocol 2.5)', () => {
  it("'pending' reads and writes nothing and opens no socket until granted", async () => {
    const getItem = vi.spyOn(env.storage, 'getItem')
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test', consent: 'pending' })
    widget.identify({ email: 'a@b.co' })
    await settle()
    expect(widget.getState().status).toBe('consent_pending')
    expect(getItem).not.toHaveBeenCalled()
    expect(env.storage.length).toBe(0)
    expect(env.requests).toHaveLength(0)
    expect(env.sockets).toHaveLength(0)

    widget.consent('granted')
    await settle()
    expect(widget.getState().status).toBe('ready')
    expect(env.storage.getItem(VISITOR_KEY)).not.toBeNull()
    // The identify queued during 'pending' is applied after boot.
    expect(backend.calls('/identify')[0]!.body).toEqual({ profile: { email: 'a@b.co' } })
  })

  it("'denied' deletes both keys and stops the socket", async () => {
    const socket = await start()
    env.storage.setItem(SESSION_KEY, '{}')
    env.storage.setItem('unrelated', '1')
    widget.consent('denied')
    expect(env.storage.getItem(VISITOR_KEY)).toBeNull()
    expect(env.storage.getItem(SESSION_KEY)).toBeNull()
    expect(env.storage.getItem('unrelated')).toBe('1')
    expect(socket.closedWith).toBe(1000)
    expect(widget.getState().status).toBe('consent_pending')
  })
})

describe('sending (protocol 6.3)', () => {
  it('shows a new conversation as sending, then moves it under the acked conversation', async () => {
    const socket = await start()
    widget.showNewMessage('Hi')
    expect(widget.getState().view).toEqual({ name: 'thread', conversationId: null })
    expect(widget.consumePrefill()).toBe('Hi')

    const clientId = widget.send({ conversationId: null, text: '  Hello there  ' })
    const pending = widget.getState().threads[NEW_CONVERSATION]!.messages
    expect(pending).toEqual([
      expect.objectContaining({
        clientId,
        delivery: 'sending',
        body: { format: 'text', content: 'Hello there' }
      })
    ])
    expect(socket.last('message.send')).toEqual({
      v: 1,
      type: 'message.send',
      id: clientId,
      data: { clientId, conversationId: null, body: { text: 'Hello there' }, attachmentIds: [] }
    })

    const second = widget.send({ conversationId: null, text: 'And another thing' })
    expect(socket.framesOf('message.send')).toHaveLength(1)

    const sent = message('cm_1', {
      clientId,
      conversationId: 'cs_new',
      sender: { type: 'USER' },
      createdAt: '2026-05-01T10:00:00.000Z'
    })
    socket.push('ack', {
      clientId,
      message: sent,
      conversation: conversation('cs_new', { updatedAt: '2026-05-01T10:00:00.000Z' })
    })

    const state = widget.getState()
    expect(state.threads[NEW_CONVERSATION]).toBeUndefined()
    expect(state.view).toEqual({ name: 'thread', conversationId: 'cs_new' })
    expect(state.threads.cs_new!.messages.map((m) => [m.id, m.delivery])).toEqual([
      ['cm_1', 'sent'],
      [`local:${second}`, 'sending']
    ])
    expect(state.conversations.map((c) => c.id)).toEqual(['cs_new'])
    expect(socket.last('message.send')!.data).toMatchObject({
      clientId: second,
      conversationId: 'cs_new'
    })
    expect(events('conversationStarted')).toEqual([{ conversationId: 'cs_new' }])
    expect(events('messageSent')).toEqual([{ conversationId: 'cs_new', messageId: 'cm_1' }])

    // message.created for the same message (and replays) don't duplicate it.
    socket.push('message.created', { message: sent })
    expect(widget.getState().threads.cs_new!.messages).toHaveLength(2)
  })

  it('shows an AI reply that arrives before the send is acked', async () => {
    const socket = await start()
    widget.showNewMessage()
    const clientId = widget.send({ conversationId: null, text: 'Hello' })
    const reply = message('cm_ai', {
      conversationId: 'cs_new',
      sender: { type: 'AI', name: null },
      createdAt: '2026-05-01T10:00:01.000Z',
      body: { format: 'markdown', content: 'Happy to help.' }
    })

    socket.push('message.created', { message: reply })

    expect(widget.getState().view).toEqual({ name: 'thread', conversationId: 'cs_new' })
    expect(widget.getState().threads.cs_new!.messages.map((m) => m.id)).toEqual([
      'cm_ai',
      `local:${clientId}`
    ])

    const sent = message('cm_1', {
      clientId,
      conversationId: 'cs_new',
      sender: { type: 'USER' },
      createdAt: '2026-05-01T10:00:00.000Z'
    })
    socket.push('ack', {
      clientId,
      message: sent,
      conversation: conversation('cs_new', {
        updatedAt: '2026-05-01T10:00:01.000Z',
        lastMessage: reply
      })
    })
    expect(widget.getState().threads.cs_new!.messages.map((m) => m.id)).toEqual(['cm_1', 'cm_ai'])
  })

  it('reconnects after an ack timeout, re-sends, then fails after 3 attempts and retries on demand', async () => {
    backend.conversations = [conversation('cs_1')]
    await start()
    const clientId = widget.send({ conversationId: 'cs_1', text: 'ping' })
    for (let attempt = 1; attempt < 3; attempt++) {
      await vi.advanceTimersByTimeAsync(10_000)
      accept()
    }
    expect(env.sockets.flatMap((s) => s.framesOf('message.send'))).toHaveLength(3)
    await vi.advanceTimersByTimeAsync(10_000)
    const failed = widget.getState().threads.cs_1!.messages[0]!
    expect(failed.delivery).toBe('failed')
    expect(failed.error?.code).toBe('delivery_failed')

    accept()
    widget.retry(clientId)
    expect(widget.getState().threads.cs_1!.messages[0]!.delivery).toBe('sending')
    expect(env.socket().last('message.send')!.data.clientId).toBe(clientId)
  })

  it('keeps queued messages across a reconnect and sends them after auth.ok', async () => {
    backend.conversations = [conversation('cs_1')]
    const socket = await start()
    socket.serverClose(1006)
    widget.send({ conversationId: 'cs_1', text: 'offline message' })
    await vi.advanceTimersByTimeAsync(1_000)
    const next = env.socket()
    expect(next).not.toBe(socket)
    expect(next.framesOf('message.send')).toHaveLength(0)
    accept(next)
    expect(next.framesOf('message.send')).toHaveLength(1)
  })

  it('fails a message on a server error frame, and blocks anonymous senders on identifiedOnly', async () => {
    backend.conversations = [conversation('cs_1')]
    const socket = await start()
    const clientId = widget.send({ conversationId: 'cs_1', text: 'too fast' })
    socket.push(
      'error',
      { error: { code: 'rate_limited', message: 'Slow down' }, clientId },
      { id: clientId }
    )
    expect(widget.getState().threads.cs_1!.messages[0]).toMatchObject({
      delivery: 'failed',
      error: { code: 'rate_limited' }
    })

    widget.discard(clientId)
    expect(widget.getState().threads.cs_1!.messages).toHaveLength(0)

    socket.push('error', { error: { code: 'identified_only', message: 'Log in' } })
    expect(widget.getState().loginRequired).toBe(true)
    expect(() => widget.send({ conversationId: 'cs_1', text: 'x' })).toThrow(
      expect.objectContaining({ code: 'identified_only' })
    )
  })

  it('validates input', async () => {
    await start()
    expect(() => widget.send({ conversationId: null, text: '   ' })).toThrow(
      expect.objectContaining({ code: 'message_empty' })
    )
    expect(() => widget.send({ conversationId: null, text: 'x'.repeat(10_001) })).toThrow(
      expect.objectContaining({ code: 'message_too_long' })
    )
    await expect(
      widget.uploadFile(new Blob(['x'], { type: 'image/svg+xml' }))
    ).rejects.toMatchObject({
      code: 'file_type_not_allowed'
    })
    await expect(
      widget.uploadFile({
        size: 11 * 1024 * 1024,
        type: 'image/png',
        name: 'big.png'
      } as unknown as Blob)
    ).rejects.toMatchObject({ code: 'file_too_large' })
  })
})

describe('receiving', () => {
  it('adds agent messages, emits events, tracks unread, typing and status updates', async () => {
    backend.conversations = [conversation('cs_1', { lastMessage: message('cm_0') })]
    backend.messages.cs_1 = [message('cm_0')]
    const socket = await start()
    await widget.loadMessages('cs_1')

    socket.push('typing', {
      conversationId: 'cs_1',
      sender: { type: 'AI', name: null },
      isTyping: true
    })
    expect(widget.getState().typing.cs_1).toEqual({ sender: { type: 'AI', name: null } })
    await vi.advanceTimersByTimeAsync(6_000)
    expect(widget.getState().typing.cs_1).toBeUndefined()

    socket.push('typing', {
      conversationId: 'cs_1',
      sender: { type: 'AI', name: null },
      isTyping: true
    })
    socket.push(
      'message.created',
      {
        message: message('cm_1', { sender: { type: 'AI' }, createdAt: '2026-05-01T10:00:01.000Z' })
      },
      { cursor: 'c2' }
    )
    socket.push('unread.updated', { total: 1 })
    socket.push('conversation.updated', {
      conversation: conversation('cs_1', {
        phase: 'team',
        unreadCount: 1,
        updatedAt: '2026-05-01T10:00:01.000Z',
        ticket: { id: 'tk_1', status: { slug: 'open', label: 'Open', theme: 'BLUE' } }
      })
    })

    const state = widget.getState()
    expect(state.typing.cs_1).toBeUndefined()
    expect(state.threads.cs_1!.messages.map((m) => m.id)).toEqual(['cm_0', 'cm_1'])
    expect(state.unreadCount).toBe(1)
    expect(state.conversations[0]).toMatchObject({
      phase: 'team',
      ticket: { status: { label: 'Open' } }
    })
    expect(events('messageReceived')).toEqual([{ conversationId: 'cs_1', messageId: 'cm_1' }])
    expect(events('unreadCountChange')).toEqual([{ count: 1 }])
  })

  it('marks the open thread read', async () => {
    backend.conversations = [conversation('cs_1', { unreadCount: 2, lastMessage: message('cm_2') })]
    backend.messages.cs_1 = [
      message('cm_1'),
      message('cm_2', { createdAt: '2026-05-01T09:30:00.000Z' })
    ]
    backend.unreadCount = 2
    const socket = await start()
    widget.showConversation('cs_1')
    await settle()
    expect(socket.last('conversation.read')!.data).toEqual({
      conversationId: 'cs_1',
      upToMessageId: 'cm_2'
    })
    expect(widget.getState().unreadCount).toBe(0)
    expect(widget.getState().conversations[0]!.unreadCount).toBe(0)
    socket.push('message.created', {
      message: message('cm_3', { createdAt: '2026-05-01T10:00:05.000Z' })
    })
    expect(socket.last('conversation.read')!.data.upToMessageId).toBe('cm_3')

    env.setHidden(true)
    socket.push('message.created', {
      message: message('cm_4', { createdAt: '2026-05-01T10:00:06.000Z' })
    })
    expect(socket.last('conversation.read')!.data.upToMessageId).toBe('cm_3')
    env.setHidden(false)
    expect(socket.last('conversation.read')!.data.upToMessageId).toBe('cm_4')
  })

  it('resumes from the last cursor and refetches on sync.reset', async () => {
    backend.conversations = [conversation('cs_1')]
    backend.messages.cs_1 = [message('cm_1')]
    const socket = await start()
    await widget.loadMessages('cs_1')
    socket.push(
      'message.created',
      { message: message('cm_2', { createdAt: '2026-05-01T10:00:00.000Z' }) },
      { cursor: 'c7' }
    )
    socket.serverClose(1001)
    await vi.advanceTimersByTimeAsync(1_000)
    const next = env.socket()
    next.open()
    expect(next.sent[0]!.data.resumeFrom).toBe('c7')
    next.push('auth.ok', { cursor: 'c7', identity: { state: 'anonymous' } })

    backend.messages.cs_1 = [
      message('cm_1'),
      message('cm_9', { createdAt: '2026-05-01T10:01:00.000Z' })
    ]
    const before = backend.calls('/conversations').length
    next.push('sync.reset', {})
    await settle()
    expect(backend.calls('/conversations').length).toBe(before + 1)
    expect(widget.getState().threads.cs_1!.messages.map((m) => m.id)).toEqual(['cm_1', 'cm_9'])
  })

  it('sends typing at most every 2 s and stops after the visitor goes idle', async () => {
    backend.conversations = [conversation('cs_1')]
    const socket = await start()
    widget.setTyping('cs_1', true)
    widget.setTyping('cs_1', true)
    await vi.advanceTimersByTimeAsync(1_000)
    widget.setTyping('cs_1', true)
    widget.setTyping('cs_1', false)
    expect(socket.framesOf('typing').map((f) => f.data.isTyping)).toEqual([true])
    await vi.advanceTimersByTimeAsync(1_000)
    expect(socket.framesOf('typing').map((f) => f.data.isTyping)).toEqual([true, false])

    widget.setTyping('cs_1', true)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(socket.framesOf('typing').map((f) => f.data.isTyping)).toEqual([
      true,
      false,
      true,
      false
    ])
  })

  it('queues handoff and context until the socket is up', async () => {
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    widget.update({
      page: { url: 'https://acme.com/billing', title: 'Billing' },
      attributes: { plan: 'pro' }
    })
    widget.setContext({ seats: 4 })
    widget.handoff('cs_1')
    await settle()
    const socket = accept()
    expect(socket.framesOf('conversation.handoff')[0]!.data).toEqual({ conversationId: 'cs_1' })
    expect(socket.framesOf('visitor.context')).toHaveLength(1)
    expect(socket.last('visitor.context')!.data).toEqual({
      page: { url: 'http://localhost:5180/', title: 'Test page' },
      attributes: { plan: 'pro', seats: 4 }
    })
  })
})

describe('identity', () => {
  it('signed identify stores the session and reconnects with the access token (protocol 6.5)', async () => {
    const first = await start()
    const getToken = vi.fn(async () => 'jwt:u_1')
    await widget.identify({ userId: 'u_1', getToken })

    expect(backend.calls('/identify')[0]!.body).toEqual({ token: 'jwt:u_1' })
    expect(backend.calls('/identify')[0]!.headers.Authorization).toBe('Bearer tpv_1')
    const stored = JSON.parse(env.storage.getItem(SESSION_KEY)!) as StoredSession
    expect(stored).toMatchObject({ accessToken: 'tpa_1', refreshToken: 'tpr_1', userId: 'u_1' })
    expect(widget.getState().identity).toMatchObject({ state: 'verified', userId: 'u_1' })
    expect(events('identityChange')).toEqual([{ state: 'verified', userId: 'u_1' }])
    expect(first.closedWith).toBe(1000)
    expect(first.framesOf('auth.refresh')).toHaveLength(0)
    expect(env.socket().sent).toHaveLength(0)
    env.socket().open()
    expect(env.socket().sent[0]!.data).toMatchObject({
      accessToken: 'tpa_1',
      visitorToken: 'tpv_1'
    })
  })

  it('restores a stored session without calling getToken, using the access token for history', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    const getToken = vi.fn(async () => 'jwt:u_1')
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    widget.identify({ userId: 'u_1', getToken })
    await settle()
    expect(getToken).not.toHaveBeenCalled()
    expect(backend.calls('/conversations')[0]!.headers.Authorization).toBe('Bearer tpa_50')
    expect(widget.getState().identity).toMatchObject({ state: 'verified', userId: 'u_1' })
    const socket = accept()
    expect(socket.sent[0]!.data.accessToken).toBe('tpa_50')
    expect(env.sockets).toHaveLength(1)
  })

  it('identify before the socket connects opens a single, already verified socket', async () => {
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    widget.identify({ userId: 'u_1', getToken: async () => 'jwt:u_1' })
    await settle()
    expect(env.sockets).toHaveLength(1)
    env.socket().open()
    expect(env.socket().sent[0]!.data.accessToken).toBe('tpa_1')
  })

  it('switching user logs out, deletes stored state, boots fresh, then identifies (protocol 6.5)', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    backend.conversations = [conversation('cs_old')]
    await start()
    expect(widget.getState().conversations).toHaveLength(1)
    backend.conversations = []

    await widget.identify({ userId: 'u_2', getToken: async () => 'jwt:u_2' })

    const logout = backend.calls('/session/logout')[0]!
    expect(logout.headers.Authorization).toBe('Bearer tpa_50')
    expect(logout.body).toEqual({ refreshToken: 'tpr_50' })
    const boots = backend.calls('/boot')
    expect(boots).toHaveLength(2)
    expect(boots[1]!.body).not.toHaveProperty('visitorToken')
    const identify = backend.calls('/identify')[0]!
    expect(identify.headers.Authorization).toBe('Bearer tpv_1')
    expect(widget.getState().identity.userId).toBe('u_2')
    expect(widget.getState().conversations).toEqual([])
    expect(JSON.parse(env.storage.getItem(SESSION_KEY)!).userId).toBe('u_2')
  })

  it('handles 409 visitor_bound_to_other_user with a fresh visitor', async () => {
    await start()
    let first = true
    backend.override = (req) => {
      if (req.path.includes('/identify') && first) {
        first = false
        return {
          status: 409,
          body: { error: { code: 'visitor_bound_to_other_user', message: 'bound' } }
        }
      }
      return undefined
    }
    const getToken = vi.fn(async () => 'jwt:u_3')
    await widget.identify({ userId: 'u_3', getToken })
    expect(getToken).toHaveBeenCalledTimes(2)
    expect(backend.calls('/boot')).toHaveLength(2)
    expect(widget.getState().identity.userId).toBe('u_3')
  })

  it('reports token_invalid with the server message and stays anonymous', async () => {
    await start()
    backend.override = (req) =>
      req.path.includes('/identify')
        ? {
            status: 400,
            body: {
              error: {
                code: 'token_invalid',
                message: 'exp is 24h after iat; the maximum is 10 minutes',
                details: { reason: 'lifetime_too_long', claim: 'exp' }
              }
            }
          }
        : undefined
    await widget.identify({ userId: 'u_1', getToken: async () => 'jwt:u_1' })
    expect(events('error')).toEqual([
      {
        code: 'token_invalid',
        message: 'exp is 24h after iat; the maximum is 10 minutes',
        details: { reason: 'lifetime_too_long', claim: 'exp' }
      }
    ])
    expect(widget.getState().identity.state).toBe('anonymous')
  })

  it('unsigned identify sends the profile once; requireVerifiedIdentity refuses it locally', async () => {
    await start()
    await widget.identify({
      userId: 'u_1',
      email: 'ada@acme.com',
      name: 'Ada',
      attributes: { plan: 'pro' }
    })
    await widget.identify({
      userId: 'u_1',
      email: 'ada@acme.com',
      name: 'Ada',
      attributes: { plan: 'pro' }
    })
    expect(backend.calls('/identify')).toHaveLength(1)
    expect(backend.calls('/identify')[0]!.body).toEqual({
      profile: { email: 'ada@acme.com', name: 'Ada', attributes: { plan: 'pro' } }
    })
    expect(widget.getState().identity.state).toBe('unverified')

    widget.destroy()
    widget = make()
    backend.config = {
      ...backend.config,
      security: { ...backend.config.security, requireVerifiedIdentity: true }
    }
    await start()
    await widget.identify({ email: 'x@y.co' })
    expect(events('error').at(-1)).toMatchObject({ code: 'verified_identity_required' })
  })

  it('logout revokes the session, clears storage and boots a new anonymous visitor', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    await start()
    await widget.logout()
    await settle()
    expect(backend.calls('/session/logout')).toHaveLength(1)
    expect(env.storage.getItem(SESSION_KEY)).toBeNull()
    expect(JSON.parse(env.storage.getItem(VISITOR_KEY)!).token).toBe('tpv_1')
    expect(widget.getState().identity.state).toBe('anonymous')
    expect(events('identityChange').at(-1)).toEqual({ state: 'anonymous', userId: null })
    const socket = accept()
    expect(socket.sent[0]!.data).not.toHaveProperty('accessToken')
  })

  it('logout while anonymous does nothing', async () => {
    await start()
    await widget.logout()
    expect(backend.calls('/boot')).toHaveLength(1)
    expect(env.storage.getItem(VISITOR_KEY)).not.toBeNull()
  })
})

describe('session refresh and recovery (protocol 2.4, 6.6)', () => {
  it('refreshes ahead of expiry and sends auth.refresh on the open socket', async () => {
    backend.config = {
      ...backend.config,
      socket: { url: 'ws://api.test/ws/v2/widget/', heartbeatSeconds: 3600 }
    }
    storeSession({ ...backend.session(50), userId: 'u_1' })
    const socket = await start()
    await vi.advanceTimersByTimeAsync(14 * 60_000)
    expect(backend.calls('/session/refresh')[0]!.body).toEqual({ refreshToken: 'tpr_50' })
    expect(socket.last('auth.refresh')!.data).toEqual({ accessToken: 'tpa_1' })
    expect(JSON.parse(env.storage.getItem(SESSION_KEY)!).refreshToken).toBe('tpr_1')
  })

  it('refreshes at boot when the stored access token is about to expire', async () => {
    storeSession({
      ...backend.session(50),
      userId: 'u_1',
      accessExpiresAt: new Date(NOW + 10_000).toISOString()
    })
    await start()
    expect(backend.calls('/session/refresh')).toHaveLength(1)
    expect(backend.calls('/conversations')[0]!.headers.Authorization).toBe('Bearer tpa_1')
  })

  it('only one of two tabs refreshes; the other picks up the tokens from storage', async () => {
    const shared = new MemoryStorage()
    const lock = createLocalLock()
    const envA = createFakeEnv({ storage: shared, lock })
    const envB = createFakeEnv({ storage: shared, lock })
    const backendA = installBackend(envA)
    const backendB = installBackend(envB)
    for (const b of [backendA, backendB]) b.visitors.add('tpv_known')
    const session = { ...backendA.session(50), userId: 'u_1' }
    backendB.refreshTokens.add('tpr_50')
    shared.setItem(VISITOR_KEY, JSON.stringify({ token: 'tpv_known', visitorId: 'vi_1' }))
    shared.setItem(SESSION_KEY, JSON.stringify(session))

    const a = make(envA)
    const b = make(envB)
    a.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    b.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await settle()
    await vi.advanceTimersByTimeAsync(14 * 60_000)

    const refreshes =
      backendA.calls('/session/refresh').length + backendB.calls('/session/refresh').length
    expect(refreshes).toBe(1)
    expect(JSON.parse(shared.getItem(SESSION_KEY)!).refreshToken).toBe('tpr_1')
    a.destroy()
    b.destroy()
  })

  it('on 401 with a session: refresh fails, getToken re-identifies, the request is repeated', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    backend.messages.cs_1 = [message('cm_1')]
    backend.conversations = [conversation('cs_1')]
    const getToken = vi.fn(async () => 'jwt:u_1')
    widget.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    widget.identify({ userId: 'u_1', getToken })
    await settle()
    accept()

    backend.refreshTokens.clear()
    backend.override = (req) =>
      req.path.includes('/messages') && req.headers.Authorization === 'Bearer tpa_50'
        ? { status: 401, body: { error: { code: 'credentials_invalid', message: 'expired' } } }
        : undefined
    await widget.loadMessages('cs_1')
    expect(getToken).toHaveBeenCalledOnce()
    expect(widget.getState().threads.cs_1!.messages).toHaveLength(1)
    expect(widget.getState().identity.state).toBe('verified')
    expect(events('error')).toEqual([])
  })

  it('falls back to a new anonymous visitor and emits session_lost when nothing works', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    backend.conversations = [conversation('cs_1')]
    backend.messages.cs_1 = []
    await start()
    backend.refreshTokens.clear()
    backend.visitors.clear()
    backend.override = (req) =>
      req.path.includes('/messages') && req.headers.Authorization !== 'Bearer tpv_1'
        ? { status: 401, body: { error: { code: 'credentials_invalid', message: 'expired' } } }
        : undefined
    await widget.loadMessages('cs_1')
    await settle()
    expect(events('error')).toEqual([expect.objectContaining({ code: 'session_lost' })])
    expect(widget.getState().identity.state).toBe('anonymous')
    expect(env.storage.getItem(SESSION_KEY)).toBeNull()
    expect(JSON.parse(env.storage.getItem(VISITOR_KEY)!).token).toBe('tpv_1')
  })

  it('4011 refreshes, then reconnects with the new access token', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    const socket = await start()
    socket.serverClose(4011)
    await settle()
    expect(backend.calls('/session/refresh')).toHaveLength(1)
    env.socket().open()
    expect(env.socket().sent[0]!.data.accessToken).toBe('tpa_1')
  })

  it('4004 for an anonymous visitor boots a new one and reconnects', async () => {
    const socket = await start()
    backend.visitors.clear()
    socket.serverClose(4004)
    await settle()
    expect(backend.calls('/boot')).toHaveLength(2)
    expect(events('error')).toEqual([expect.objectContaining({ code: 'session_lost' })])
    env.socket().open()
    expect(env.socket().sent[0]!.data.visitorToken).toBe('tpv_2')
  })
})

describe('other tabs (protocol 6.5, 6.6)', () => {
  it('adopts tokens another tab refreshed and sends auth.refresh', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    const socket = await start()
    env.otherTab(SESSION_KEY, { ...backend.session(77), userId: 'u_1' })
    await vi.advanceTimersByTimeAsync(300)
    expect(socket.last('auth.refresh')!.data).toEqual({ accessToken: 'tpa_77' })
    expect(backend.calls('/boot')).toHaveLength(1)
  })

  it('follows a logout in another tab once its new visitor is stored', async () => {
    storeSession({ ...backend.session(50), userId: 'u_1' })
    const socket = await start()
    env.otherTab(SESSION_KEY, null)
    env.otherTab(VISITOR_KEY, null)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(backend.calls('/boot')).toHaveLength(1)

    backend.visitors.add('tpv_other')
    env.otherTab(VISITOR_KEY, { token: 'tpv_other', visitorId: 'vi_9' })
    await vi.advanceTimersByTimeAsync(300)
    await settle()
    expect(socket.closedWith).toBe(1000)
    expect(backend.calls('/boot')[1]!.body).toMatchObject({ visitorToken: 'tpv_other' })
    expect(widget.getState().identity.state).toBe('anonymous')
    expect(env.storage.getItem(VISITOR_KEY)).toContain('tpv_other')
  })

  it('follows an identify in another tab', async () => {
    backend.visitors.add('tpv_known')
    env.storage.setItem(VISITOR_KEY, JSON.stringify({ token: 'tpv_known', visitorId: 'vi_1' }))
    await start()
    env.otherTab(SESSION_KEY, { ...backend.session(60), userId: 'u_5' })
    await vi.advanceTimersByTimeAsync(300)
    await settle()
    expect(widget.getState().identity).toMatchObject({ state: 'verified', userId: 'u_5' })
    expect(backend.calls('/conversations').at(-1)!.headers.Authorization).toBe('Bearer tpa_60')
  })
})

describe('config, navigation and preview', () => {
  it('code overrides beat the dashboard; features only switch off, with one warning', async () => {
    backend.config = { ...backend.config, features: { ...backend.config.features, gifs: false } }
    await start({
      texts: { greetingTitle: 'Code title' },
      features: { ai: false, gifs: true } as unknown as NonNullable<InitOptions['features']>
    })
    const { config } = widget.getState()
    expect(config.texts.greetingTitle).toBe('Code title')
    expect(config.features).toMatchObject({ ai: false, gifs: false, emoji: true })
    widget.update({ appearance: { position: 'bottom-left' } })
    expect(widget.getState().config.appearance.position).toBe('bottom-left')
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('reopens a conversation from the last day instead of a new chat', async () => {
    backend.conversations = [conversation('cs_recent', { updatedAt: '2026-05-01T09:30:00.000Z' })]
    backend.messages.cs_recent = [message('m1', { conversationId: 'cs_recent' })]
    await start()
    widget.open()
    await settle()
    expect(widget.getState().view).toEqual({ name: 'thread', conversationId: 'cs_recent' })
    expect(backend.calls('/conversations/cs_recent/messages')).toHaveLength(1)
  })

  it('starts a new chat when the last one is older than a day', async () => {
    backend.conversations = [conversation('cs_old', { updatedAt: '2026-04-29T09:30:00.000Z' })]
    await start()
    widget.open()
    expect(widget.getState().view).toEqual({ name: 'thread', conversationId: null })
  })

  it('opens the home tab only when asked, even with a recent chat', async () => {
    backend.conversations = [conversation('cs_recent', { updatedAt: '2026-05-01T09:30:00.000Z' })]
    await start()
    widget.showHome()
    expect(widget.getState().view).toEqual({ name: 'home' })
    expect(widget.getState().open).toBe(true)
  })

  it('open/close emit once, setLocale switches direction', async () => {
    await start()
    widget.open()
    widget.open()
    widget.toggle()
    expect(events('open')).toHaveLength(1)
    expect(events('close')).toHaveLength(1)
    widget.setLocale('ar')
    expect(widget.getState().dir).toBe('rtl')
    expect(widget.getState().locale).toBe('ar')
  })

  it('preview renders a sample thread with no network, storage or socket (protocol 3.1.2)', async () => {
    widget.preview({
      config: { team: { name: 'Preview Co' }, appearance: { accentColor: '#abcdef' } },
      view: 'thread'
    })
    widget.init({ publishableKey: PK })
    await settle()
    const state = widget.getState()
    expect(state.preview).toBe(true)
    expect(state.open).toBe(true)
    expect(state.config.team.name).toBe('Preview Co')
    expect(state.config.appearance.accentColor).toBe('#abcdef')
    expect(state.view.name).toBe('thread')
    const thread = state.threads[(state.view as { conversationId: string }).conversationId]!
    expect(new Set(thread.messages.map((m) => m.sender.type))).toEqual(
      new Set(['USER', 'AI', 'SYSTEM', 'AGENT'])
    )

    widget.send({ conversationId: 'preview', text: 'Looks good' })
    widget.preview({ config: { appearance: { accentColor: '#000000' } }, view: 'home' })
    expect(widget.getState().config.appearance.accentColor).toBe('#000000')
    expect(widget.getState().threads.preview!.messages.at(-1)!.delivery).toBe('sent')

    expect(env.requests).toHaveLength(0)
    expect(env.sockets).toHaveLength(0)
    expect(env.storage.length).toBe(0)
  })

  it('keeps tracked events in memory only', async () => {
    await start()
    const before = env.requests.length
    widget.trackEvent('upgraded', { plan: 'pro' })
    expect(widget.trackedEvents()).toEqual([
      { name: 'upgraded', meta: { plan: 'pro' }, at: expect.any(String) }
    ])
    expect(env.requests.length).toBe(before)
  })

  it('loads more conversations by fetching the cursor boot does not return', async () => {
    backend.conversations = Array.from({ length: 20 }, (_, i) =>
      conversation(`cs_${i}`, { updatedAt: `2026-05-01T09:${String(i).padStart(2, '0')}:00.000Z` })
    )
    let page = 0
    backend.override = (req) => {
      if (!req.path.startsWith('/api/v2/widget/conversations?')) return undefined
      page++
      return req.path.includes('before=')
        ? {
            body: {
              conversations: [conversation('cs_old', { updatedAt: '2026-04-01T00:00:00.000Z' })],
              nextCursor: null
            }
          }
        : { body: { conversations: backend.conversations, nextCursor: 'cur_2' } }
    }
    await start()
    expect(widget.getState().conversationsHasMore).toBe(true)
    await widget.loadMoreConversations()
    expect(page).toBe(2)
    expect(widget.getState().conversations).toHaveLength(21)
    expect(widget.getState().conversations.at(-1)!.id).toBe('cs_old')
    expect(widget.getState().conversationsHasMore).toBe(false)
  })

  it('saves the contact email', async () => {
    await start()
    await expect(widget.saveContact('nope')).rejects.toMatchObject({ code: 'invalid_email' })
    await widget.saveContact('ada@acme.com')
    expect(widget.getState().identity.contactEmail).toBe('ada@acme.com')
  })
})

// In-memory widget API for the playground. Same REST shapes as
// `packages/core/src/testing/backend.ts` and spec/protocol.md sections 4 and 6.
// State lives for one Vite dev-server process and is not written to disk.
import { Buffer } from 'node:buffer'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin } from 'vite'
import { WebSocket, WebSocketServer } from 'ws'
import { config, conversation, message } from '../../packages/core/src/testing/backend.ts'
import type {
  Conversation,
  Identity,
  Message,
  Session,
  WidgetConfig
} from '../../packages/core/src/types.ts'

const PREFIX = '/api/v2/widget'
const SOCKET_PATH = '/ws/v2/widget'
const PAGE = 20
const MESSAGE_PAGE = 50
const MAX_TEXT = 10_000
const MAX_ACK_DELAY_MS = 30_000

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Ticketping-Client',
  'Cache-Control': 'no-store'
}

const ANONYMOUS: Identity = {
  state: 'anonymous',
  userId: null,
  name: null,
  email: null,
  contactEmail: null
}

interface Visitor {
  id: string
  token: string
  identity: Identity
}

interface StoredAck {
  clientId: string
  message: Message
  conversation?: Conversation
}

interface MockState {
  seq: number
  cursor: number
  visitors: Map<string, Visitor>
  threads: Map<string, Conversation[]>
  messages: Map<string, Message[]>
  acks: Map<string, StoredAck>
  accessTokens: Map<string, Visitor>
  refreshTokens: Map<string, Visitor>
}

interface InFrame {
  type: string
  id?: string
  data: Record<string, unknown>
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

function createState(): MockState {
  return {
    seq: 0,
    cursor: 0,
    visitors: new Map(),
    threads: new Map(),
    messages: new Map(),
    acks: new Map(),
    accessTokens: new Map(),
    refreshTokens: new Map()
  }
}

function widgetConfig(host: string): WidgetConfig {
  return config({
    socket: { url: `ws://${host}/ws/v2/widget/`, heartbeatSeconds: 25 }
  })
}

function issueSession(state: MockState, visitor: Visitor): Session {
  const n = ++state.seq
  const session: Session = {
    accessToken: `tpa_${n}`,
    accessExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: `tpr_${n}`,
    refreshExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString()
  }
  state.accessTokens.set(session.accessToken, visitor)
  state.refreshTokens.set(session.refreshToken, visitor)
  return session
}

function conversationsOf(state: MockState, visitor: Visitor): Conversation[] {
  return state.threads.get(visitor.id) ?? []
}

function findConversation(
  state: MockState,
  visitor: Visitor,
  id: string
): Conversation | undefined {
  return conversationsOf(state, visitor).find((item) => item.id === id)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function sendEmpty(res: ServerResponse, status: number): void {
  res.writeHead(status, CORS)
  res.end()
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    if (typeof chunk === 'string') chunks.push(Buffer.from(chunk))
    else if (chunk instanceof Uint8Array) chunks.push(chunk)
    else throw new HttpError(400, 'invalid_request', 'Body must be JSON.')
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new HttpError(400, 'invalid_request', 'Body must be JSON.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'invalid_request', 'Body must be a JSON object.')
  }
  return value as Record<string, unknown>
}

function bearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

function caller(state: MockState, req: IncomingMessage): Visitor {
  const token = bearer(req)
  const visitor = token
    ? (state.visitors.get(token) ?? state.accessTokens.get(token) ?? null)
    : null
  if (!visitor) {
    throw new HttpError(401, 'credentials_invalid', 'Visitor or access token is missing.')
  }
  return visitor
}

function requireKey(value: unknown): void {
  if (typeof value !== 'string' || !value.startsWith('pk_')) {
    throw new HttpError(401, 'key_invalid', 'Publishable key is missing or malformed.')
  }
}

function pageConversations(
  all: Conversation[],
  before: string | null
): { conversations: Conversation[]; nextCursor: string | null } {
  let start = 0
  if (before) {
    const index = all.findIndex((item) => item.id === before)
    start = index === -1 ? all.length : index + 1
  }
  const conversations = all.slice(start, start + PAGE)
  const last = conversations[conversations.length - 1]
  const nextCursor = start + PAGE < all.length && last ? last.id : null
  return { conversations, nextCursor }
}

function pageMessages(
  all: Message[],
  before: string | null
): { messages: Message[]; hasMore: boolean } {
  let end = all.length
  if (before) {
    const index = all.findIndex((item) => item.id === before)
    end = index === -1 ? 0 : index
  }
  const start = Math.max(0, end - MESSAGE_PAGE)
  return { messages: all.slice(start, end), hasMore: start > 0 }
}

function boot(state: MockState, host: string, body: Record<string, unknown>) {
  requireKey(body.publishableKey)
  const known =
    typeof body.visitorToken === 'string' ? state.visitors.get(body.visitorToken) : undefined
  let visitor = known
  let issued = false
  if (!visitor) {
    const n = ++state.seq
    visitor = { id: `vi_${n}`, token: `tpv_${n}`, identity: { ...ANONYMOUS } }
    state.visitors.set(visitor.token, visitor)
    state.threads.set(visitor.id, [])
    issued = true
  }
  const identity = visitor.identity.state === 'verified' ? { ...ANONYMOUS } : visitor.identity
  return {
    config: widgetConfig(host),
    visitor: issued ? { id: visitor.id, token: visitor.token } : { id: visitor.id },
    identity,
    conversations: conversationsOf(state, visitor).slice(0, PAGE),
    unreadCount: 0
  }
}

function identify(state: MockState, visitor: Visitor, body: Record<string, unknown>) {
  if (typeof body.token === 'string' && body.token) {
    const userId = body.token.replace(/^jwt:/, '')
    visitor.identity = {
      state: 'verified',
      userId,
      name: 'Ada',
      email: 'ada@acme.com',
      contactEmail: visitor.identity.contactEmail
    }
    return {
      identity: visitor.identity,
      session: issueSession(state, visitor),
      conversations: conversationsOf(state, visitor).slice(0, PAGE),
      unreadCount: 0
    }
  }
  const profile = (body.profile ?? {}) as { email?: unknown; name?: unknown }
  if (!profile || typeof body.profile !== 'object') {
    throw new HttpError(400, 'invalid_request', 'Identify needs a token or a profile.')
  }
  visitor.identity = {
    state: 'unverified',
    userId: null,
    name: typeof profile.name === 'string' ? profile.name : null,
    email: typeof profile.email === 'string' ? profile.email : null,
    contactEmail: visitor.identity.contactEmail
  }
  return { identity: visitor.identity }
}

function saveContact(visitor: Visitor, body: Record<string, unknown>) {
  const email = body.email
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new HttpError(400, 'invalid_request', 'Email is invalid.')
  }
  visitor.identity = { ...visitor.identity, contactEmail: email }
  return { identity: visitor.identity }
}

function hostOf(req: IncomingMessage): string {
  return req.headers.host ?? 'localhost:5180'
}

function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function searchParam(url: string | undefined, name: string): string | null {
  if (!url) return null
  try {
    return new URL(url).searchParams.get(name)
  } catch {
    return null
  }
}

function slowAckMs(req: IncomingMessage): number {
  const raw =
    searchParam(req.headers.referer, 'slowAck') ?? cookieValue(req.headers.cookie, 'tp_slow_ack')
  if (!raw) return 0
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(n, MAX_ACK_DELAY_MS)
}

async function route(state: MockState, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204)
    return
  }
  const path = url.pathname.replace(/\/$/, '').replace(PREFIX, '') || '/'
  const before = url.searchParams.get('before')

  if (path === '/boot' && req.method === 'POST') {
    sendJson(res, 200, boot(state, hostOf(req), await readJson(req)))
    return
  }
  if (path === '/identify' && req.method === 'POST') {
    sendJson(res, 200, identify(state, caller(state, req), await readJson(req)))
    return
  }
  if (path === '/visitor/contact' && req.method === 'POST') {
    sendJson(res, 200, saveContact(caller(state, req), await readJson(req)))
    return
  }
  if (path === '/conversations' && req.method === 'GET') {
    const page = pageConversations(conversationsOf(state, caller(state, req)), before)
    sendJson(res, 200, page)
    return
  }
  const thread = /^\/conversations\/([^/]+)\/messages$/.exec(path)
  if (thread && req.method === 'GET') {
    const id = decodeURIComponent(thread[1] ?? '')
    const visitor = caller(state, req)
    if (!findConversation(state, visitor, id)) {
      throw new HttpError(404, 'not_found', 'Not found.')
    }
    sendJson(res, 200, pageMessages(state.messages.get(id) ?? [], before))
    return
  }
  if ((path === '/gifs/trending' || path === '/gifs/search') && req.method === 'GET') {
    caller(state, req)
    sendJson(res, 200, { results: [], nextOffset: null })
    return
  }
  if (path === '/uploads' && req.method === 'POST') {
    caller(state, req)
    throw new HttpError(400, 'invalid_request', 'The playground mock does not store uploads.')
  }
  if (path === '/session/refresh' && req.method === 'POST') {
    const body = await readJson(req)
    const token = body.refreshToken
    const visitor = typeof token === 'string' ? state.refreshTokens.get(token) : undefined
    if (typeof token !== 'string' || !visitor || !state.refreshTokens.delete(token)) {
      throw new HttpError(401, 'credentials_invalid', 'Refresh token is revoked.')
    }
    for (const [access, owner] of state.accessTokens) {
      if (owner === visitor) state.accessTokens.delete(access)
    }
    sendJson(res, 200, { session: issueSession(state, visitor) })
    return
  }
  if (path === '/session/logout' && req.method === 'POST') {
    const visitor = caller(state, req)
    await readJson(req)
    for (const [access, owner] of state.accessTokens) {
      if (owner === visitor) state.accessTokens.delete(access)
    }
    for (const [refreshToken, owner] of state.refreshTokens) {
      if (owner === visitor) state.refreshTokens.delete(refreshToken)
    }
    if (visitor.identity.state === 'verified') visitor.identity = { ...ANONYMOUS }
    sendEmpty(res, 204)
    return
  }
  throw new HttpError(404, 'not_found', `No route ${path}.`)
}

function parseFrame(raw: unknown): InFrame | null {
  let text: string
  if (typeof raw === 'string') text = raw
  else if (raw instanceof Uint8Array) text = new TextDecoder().decode(raw)
  else return null
  try {
    const value = JSON.parse(text) as unknown
    if (!value || typeof value !== 'object') return null
    const frame = value as { type?: unknown; id?: unknown; data?: unknown }
    if (typeof frame.type !== 'string') return null
    const data =
      frame.data && typeof frame.data === 'object' && !Array.isArray(frame.data)
        ? (frame.data as Record<string, unknown>)
        : {}
    const parsed: InFrame = { type: frame.type, data }
    if (typeof frame.id === 'string') parsed.id = frame.id
    return parsed
  } catch {
    return null
  }
}

function sendFrame(
  socket: WebSocket,
  type: string,
  data: Record<string, unknown>,
  id?: string,
  cursor?: string
): void {
  if (socket.readyState !== WebSocket.OPEN) return
  const frame: Record<string, unknown> = { v: 1, type, data }
  if (id !== undefined) frame.id = id
  if (cursor !== undefined) frame.cursor = cursor
  socket.send(JSON.stringify(frame))
}

function nextCursor(state: MockState): string {
  state.cursor += 1
  return `c${state.cursor}`
}

function userText(data: Record<string, unknown>): string {
  const body = data.body
  if (!body || typeof body !== 'object') return ''
  const text = (body as { text?: unknown }).text
  return typeof text === 'string' ? text : ''
}

function acceptMessage(
  state: MockState,
  visitor: Visitor,
  frame: InFrame
): { stored: StoredAck; fresh: boolean } | HttpError {
  const clientId = typeof frame.data.clientId === 'string' ? frame.data.clientId : ''
  if (!clientId) return new HttpError(400, 'invalid_request', 'clientId is required.')
  const cached = state.acks.get(`${visitor.id}:${clientId}`)
  if (cached) return { stored: cached, fresh: false }

  const text = userText(frame.data)
  const hasGif = !!frame.data.gif && typeof frame.data.gif === 'object'
  const attachmentIds = Array.isArray(frame.data.attachmentIds) ? frame.data.attachmentIds : []
  if (!text.trim() && !hasGif && attachmentIds.length === 0) {
    return new HttpError(400, 'invalid_request', 'Message is empty.')
  }
  if (text.length > MAX_TEXT) {
    return new HttpError(400, 'invalid_request', 'Message is too long.')
  }

  const now = new Date().toISOString()
  const requested = frame.data.conversationId
  let thread =
    typeof requested === 'string' ? findConversation(state, visitor, requested) : undefined
  if (typeof requested === 'string' && !thread) {
    return new HttpError(404, 'not_found', 'Not found.')
  }
  const created = !thread
  const conversationId = thread?.id ?? `cs_${++state.seq}`
  const userMessage = message(`cm_${++state.seq}`, {
    conversationId,
    clientId,
    createdAt: now,
    sender: { type: 'USER' },
    body: { format: 'text', content: text }
  })
  if (!thread) {
    thread = conversation(conversationId, {
      createdAt: now,
      updatedAt: now,
      phase: 'ai',
      isTest: true,
      lastMessage: userMessage
    })
    const list = conversationsOf(state, visitor)
    list.unshift(thread)
    state.threads.set(visitor.id, list)
    state.messages.set(conversationId, [userMessage])
  } else {
    thread.updatedAt = now
    thread.lastMessage = userMessage
    const list = state.messages.get(conversationId) ?? []
    list.push(userMessage)
    state.messages.set(conversationId, list)
  }

  const stored: StoredAck = { clientId, message: userMessage }
  if (created) stored.conversation = thread
  state.acks.set(`${visitor.id}:${clientId}`, stored)
  return { stored, fresh: true }
}

function mockReply(state: MockState, thread: Conversation): Message {
  const now = new Date().toISOString()
  const reply = message(`cm_${++state.seq}`, {
    conversationId: thread.id,
    createdAt: now,
    sender: { type: 'AI', name: null },
    body: { format: 'markdown', content: 'Thanks, the playground mock received that.' }
  })
  const list = state.messages.get(thread.id) ?? []
  list.push(reply)
  state.messages.set(thread.id, list)
  thread.updatedAt = now
  thread.lastMessage = reply
  return reply
}

function connectSocket(state: MockState, socket: WebSocket, delayMs: number): void {
  let visitor: Visitor | null = null
  socket.on('message', (raw) => {
    const frame = parseFrame(raw)
    if (!frame) {
      socket.close(4000, 'bad frame')
      return
    }
    if (!visitor) {
      if (frame.type !== 'auth') {
        socket.close(4000, 'frame before auth')
        return
      }
      const key = frame.data.publishableKey
      if (typeof key !== 'string' || !key.startsWith('pk_')) {
        socket.close(4003, 'key invalid')
        return
      }
      const token = frame.data.visitorToken
      visitor = typeof token === 'string' ? (state.visitors.get(token) ?? null) : null
      if (!visitor) {
        socket.close(4004, 'visitor invalid')
        return
      }
      sendFrame(socket, 'auth.ok', {
        visitorId: visitor.id,
        identity: visitor.identity,
        cursor: nextCursor(state)
      })
      return
    }
    if (frame.type === 'ping') {
      sendFrame(socket, 'pong', {})
      return
    }
    if (frame.type !== 'message.send') return
    const who = visitor
    const result = acceptMessage(state, who, frame)
    if (result instanceof HttpError) {
      sendFrame(
        socket,
        'error',
        { error: { code: result.code, message: result.message }, clientId: frame.data.clientId },
        frame.id
      )
      return
    }
    const ack: Record<string, unknown> = {
      clientId: result.stored.clientId,
      message: result.stored.message
    }
    if (result.stored.conversation) ack.conversation = result.stored.conversation
    const finish = () => {
      sendFrame(socket, 'ack', ack, frame.id)
      if (!result.fresh) return
      const thread =
        result.stored.conversation ??
        findConversation(state, who, result.stored.message.conversationId)
      if (!thread) return
      const reply = mockReply(state, thread)
      const cursor = nextCursor(state)
      sendFrame(socket, 'message.created', { message: reply }, undefined, cursor)
      sendFrame(
        socket,
        'conversation.updated',
        { conversation: thread },
        undefined,
        nextCursor(state)
      )
    }
    if (delayMs > 0) setTimeout(finish, delayMs)
    else finish()
  })
  socket.on('error', () => socket.close())
}

function isWidgetSocket(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0] ?? ''
  return path === SOCKET_PATH || path === `${SOCKET_PATH}/`
}

/** Vite middleware plus the widget socket, on the playground's own origin. */
export function playgroundMock(): Plugin {
  return {
    name: 'ticketping-playground-mock',
    configureServer(server) {
      const state = createState()
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith(PREFIX)) {
          next()
          return
        }
        void route(state, req, res).catch((err: unknown) => {
          if (res.headersSent) return
          if (err instanceof HttpError) {
            sendJson(res, err.status, { error: { code: err.code, message: err.message } })
            return
          }
          sendJson(res, 500, {
            error: { code: 'server_error', message: 'Playground mock failed.' }
          })
        })
      })

      const wss = new WebSocketServer({ noServer: true })
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (!isWidgetSocket(req.url)) return
        wss.handleUpgrade(req, socket as Duplex, head, (ws) =>
          connectSocket(state, ws, slowAckMs(req))
        )
      })
      server.httpServer?.on('close', () => wss.close())
    }
  }
}

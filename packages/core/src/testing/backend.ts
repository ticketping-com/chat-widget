// A scriptable in-memory backend for controller tests: answers the REST routes of protocol 4
// through `FakeEnv.route`. Socket frames are driven by each test through `FakeSocket`.
import type { Conversation, Message, Session, WidgetConfig } from '../types.ts'
import type { FakeEnv, FakeRequest, FakeResponse } from './fakes.ts'

export const PK = 'pk_aaaaaaaaaaaaaaaaaaaaaaaa'

export function config(patch: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: 'wc_1',
    isTest: true,
    team: {
      name: 'Acme',
      avatars: [],
      replyTimeHint: 'Usually replies in minutes',
      availability: { state: 'online', next: null, hours: null }
    },
    appearance: {
      accentColor: '#112233',
      colorMode: 'light',
      position: 'bottom-right',
      launcher: { icon: 'chat', label: null, hideWhenOpen: false }
    },
    texts: {},
    features: { ai: true, attachments: true, emailCapture: true, emoji: true, gifs: true },
    security: { requireVerifiedIdentity: false, identifiedOnly: false, loginUrl: null },
    branding: { poweredBy: true },
    socket: { url: 'ws://api.test/ws/v2/widget/', heartbeatSeconds: 25 },
    ...patch
  }
}

export function message(id: string, patch: Partial<Message> = {}): Message {
  return {
    id,
    conversationId: 'cs_1',
    createdAt: '2026-05-01T09:00:00.000Z',
    sender: { type: 'AGENT', name: 'Grace' },
    kind: 'message',
    body: { format: 'markdown', content: `Message ${id}` },
    attachments: [],
    event: null,
    ...patch
  }
}

export function conversation(id: string, patch: Partial<Conversation> = {}): Conversation {
  return {
    id,
    createdAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
    phase: 'ai',
    isTest: true,
    unreadCount: 0,
    assignee: null,
    ticket: null,
    lastMessage: null,
    ...patch
  }
}

type Handler = (req: FakeRequest) => FakeResponse | 'network-error' | undefined

export interface FakeBackend {
  config: WidgetConfig
  conversations: Conversation[]
  messages: Record<string, Message[]>
  unreadCount: number
  /** Visitor tokens the server knows. */
  visitors: Set<string>
  issued: number
  /** Valid refresh tokens; rotated on use. */
  refreshTokens: Set<string>
  sessionLifetimeMs: number
  /** Return a response to short-circuit a route, or `undefined` to fall through. */
  override: Handler | null
  calls(path: string): FakeRequest[]
  session(n: number): Session
}

export function installBackend(env: FakeEnv): FakeBackend {
  const backend: FakeBackend = {
    config: config(),
    conversations: [],
    messages: {},
    unreadCount: 0,
    visitors: new Set(),
    issued: 0,
    refreshTokens: new Set(),
    sessionLifetimeMs: 15 * 60_000,
    override: null,
    calls: (path) => env.requests.filter((r) => r.path.split('?')[0] === `/api/v2/widget${path}`),
    session(n) {
      const token = `tpr_${n}`
      backend.refreshTokens.add(token)
      return {
        accessToken: `tpa_${n}`,
        accessExpiresAt: new Date(Date.now() + backend.sessionLifetimeMs).toISOString(),
        refreshToken: token,
        refreshExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString()
      }
    }
  }
  let sessions = 0

  env.route = (req) => {
    const custom = backend.override?.(req)
    if (custom) return custom
    const path = req.path.replace('/api/v2/widget', '').split('?')[0] ?? ''
    const body = (req.body ?? {}) as Record<string, unknown>
    const bearer = req.headers.Authorization?.replace('Bearer ', '') ?? null

    if (path === '/boot') {
      const known = typeof body.visitorToken === 'string' && backend.visitors.has(body.visitorToken)
      const visitor: { id: string; token?: string } = { id: 'vi_1' }
      if (!known) {
        const token = `tpv_${++backend.issued}`
        backend.visitors.add(token)
        visitor.token = token
        visitor.id = `vi_${backend.issued}`
      }
      return {
        body: {
          config: backend.config,
          visitor,
          identity: {
            state: 'anonymous',
            userId: null,
            name: null,
            email: null,
            contactEmail: null
          },
          conversations: backend.conversations,
          unreadCount: backend.unreadCount
        }
      }
    }
    if (path === '/identify') {
      if (typeof body.token === 'string') {
        const userId = body.token.replace(/^jwt:/, '')
        return {
          body: {
            identity: {
              state: 'verified',
              userId,
              name: 'Ada',
              email: 'ada@acme.com',
              contactEmail: null
            },
            session: backend.session(++sessions),
            conversations: backend.conversations,
            unreadCount: backend.unreadCount
          }
        }
      }
      const profile = body.profile as { email?: string; name?: string }
      return {
        body: {
          identity: {
            state: 'unverified',
            userId: null,
            name: profile.name ?? null,
            email: profile.email ?? null,
            contactEmail: null
          }
        }
      }
    }
    if (path === '/session/refresh') {
      const token = body.refreshToken as string
      if (!backend.refreshTokens.delete(token)) {
        return { status: 401, body: { error: { code: 'credentials_invalid', message: 'revoked' } } }
      }
      return { body: { session: backend.session(++sessions) } }
    }
    if (path === '/session/logout') return { status: 204 }
    if (path === '/visitor/contact') {
      return {
        body: {
          identity: {
            state: 'anonymous',
            userId: null,
            name: null,
            email: null,
            contactEmail: body.email
          }
        }
      }
    }
    if (path === '/conversations') {
      return { body: { conversations: backend.conversations, nextCursor: null, bearer } }
    }
    const thread = /^\/conversations\/([^/]+)\/messages$/.exec(path)
    if (thread) {
      const list = backend.messages[decodeURIComponent(thread[1] ?? '')]
      if (!list)
        return { status: 404, body: { error: { code: 'not_found', message: 'Not found' } } }
      return { body: { messages: list, hasMore: false } }
    }
    return { status: 404, body: { error: { code: 'not_found', message: `No route ${path}` } } }
  }
  return backend
}

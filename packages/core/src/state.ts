import { resolveConfig, type ResolvedConfig } from './config.ts'
import { createI18n, type I18n } from './i18n.ts'
import type {
  Conversation,
  Identity,
  Message,
  SenderType,
  WidgetConfig,
  WidgetError
} from './types.ts'

/** Key of the thread holding messages for a conversation the server hasn't created yet. */
export const NEW_CONVERSATION = 'new'

export type ViewState =
  | { name: 'home' }
  | { name: 'messages' }
  /** `conversationId: null` is a new conversation (composer only, until the first `ack`). */
  | { name: 'thread'; conversationId: string | null }

export type DeliveryState = 'sending' | 'sent' | 'failed'

/** A message as the UI renders it. Messages from the server have no `delivery`: they're stored. */
export interface ThreadMessage extends Message {
  /** Only on the visitor's own messages sent from this tab. */
  delivery?: DeliveryState
  /** Why delivery failed, e.g. `rate_limited`, `delivery_failed`, `invalid_request`. */
  error?: WidgetError
}

export interface ThreadState {
  /** Oldest first. Unacknowledged local messages are always last. */
  messages: ThreadMessage[]
  /** More history before `messages[0]` (protocol 4.5 `hasMore`). */
  hasMore: boolean
  loading: boolean
  /** The first page arrived (or the thread is new and has nothing to load). */
  loaded: boolean
  error: WidgetError | null
  /** Started from the blank composer. The greeting stays at the top after the server assigns an id. */
  greeting?: boolean
}

export interface TypingIndicator {
  sender: { type: SenderType; name: string | null }
}

export type WidgetStatus =
  /** Before `init`, after `destroy`, or after `consent('denied')`. */
  | 'idle'
  | 'consent_pending'
  | 'booting'
  | 'ready'
  /** `boot` failed for good (bad key, origin not allowed). The widget stays hidden. */
  | 'failed'
  | 'preview'

/**
 * `online`: socket authenticated. `connecting`: first connection of this page. `reconnecting`:
 * was online before (show the reconnect banner). `offline`: gave up (4003 or repeated 4000).
 */
export type ConnectionState = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'offline'

export interface ResolvedWidgetConfig extends ResolvedConfig {
  id: string
  isTest: boolean
  team: WidgetConfig['team']
  security: WidgetConfig['security']
  branding: WidgetConfig['branding']
  socket: WidgetConfig['socket']
}

/** Everything the UI renders. Immutable: every change produces a new object. */
export interface WidgetState {
  status: WidgetStatus
  open: boolean
  launcherVisible: boolean
  view: ViewState
  config: ResolvedWidgetConfig
  locale: string
  dir: 'ltr' | 'rtl'
  /** Rebuilt when locale or texts change, so `$derived` UI code re-renders. */
  i18n: I18n
  identity: Identity
  connection: ConnectionState
  /** Newest first, by `updatedAt`. */
  conversations: Conversation[]
  conversationsLoading: boolean
  /** More conversations can be loaded with `loadMoreConversations()`. */
  conversationsHasMore: boolean
  /** By conversation ID, plus `NEW_CONVERSATION`. Absent until `loadMessages()` or a send. */
  threads: Readonly<Record<string, ThreadState>>
  /** By conversation ID. Cleared after 6 s without an update (protocol 6.2). */
  typing: Readonly<Record<string, TypingIndicator>>
  /**
   * Conversations where the visitor is waiting on an AI reply.
   * Set about 2 s after send, so a missed server typing frame still shows the dots.
   */
  pendingReply: Readonly<Record<string, true>>
  /** Total for the launcher badge (protocol 6.2 `unread.updated`). */
  unreadCount: number
  /** Text for the composer from `showNewMessage(prefill)`. Call `consumePrefill()` once used. */
  prefill: string | null
  /** `identifiedOnly` config and an anonymous visitor: show "Log in to chat" instead of the composer. */
  loginRequired: boolean
  lastError: WidgetError | null
  /** Rendering a preview (protocol 3.1.2): no network, no storage. */
  preview: boolean
}

export const DEFAULT_SOCKET_URL = 'wss://api.ticketping.com/ws/v2/widget/'

export const ANONYMOUS: Identity = {
  state: 'anonymous',
  userId: null,
  name: null,
  email: null,
  contactEmail: null
}

export const DEFAULT_WIDGET_CONFIG: Omit<WidgetConfig, keyof ResolvedConfig | 'texts'> = {
  id: '',
  isTest: false,
  team: {
    name: '',
    avatars: [],
    replyTimeHint: null,
    availability: { state: 'online', next: null, hours: null }
  },
  security: { requireVerifiedIdentity: false, identifiedOnly: false, loginUrl: null },
  branding: { poweredBy: true },
  socket: { url: DEFAULT_SOCKET_URL, heartbeatSeconds: 25 }
}

type Loose<T> = {
  [K in keyof T]?: T[K] extends object ? Loose<T[K]> | undefined : T[K] | undefined
}
export type PartialWidgetConfig = Loose<WidgetConfig>

const obj = <T>(value: unknown): Partial<T> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<T>) : {}

/** Fills a partial or untrusted config (boot response, preview input) with built-in defaults. */
export function normalizeConfig(input: unknown): WidgetConfig {
  const raw = obj<WidgetConfig>(input)
  const base = resolveConfig(undefined)
  const appearance = obj<WidgetConfig['appearance']>(raw.appearance)
  const pick = <T extends object>(defaults: T, value: unknown): T => {
    const out = { ...defaults }
    for (const [key, v] of Object.entries(obj<T>(value))) {
      if (v !== undefined && key in defaults) (out as Record<string, unknown>)[key] = v
    }
    return out
  }
  return {
    id: typeof raw.id === 'string' ? raw.id : DEFAULT_WIDGET_CONFIG.id,
    isTest: raw.isTest === true,
    team: pick(DEFAULT_WIDGET_CONFIG.team, raw.team),
    appearance: {
      ...pick(base.appearance, appearance),
      launcher: pick(base.appearance.launcher, appearance.launcher)
    },
    texts: Object.fromEntries(
      Object.entries(obj<Record<string, unknown>>(raw.texts)).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    ),
    features: pick(base.features, raw.features),
    security: pick(DEFAULT_WIDGET_CONFIG.security, raw.security),
    branding: pick(DEFAULT_WIDGET_CONFIG.branding, raw.branding),
    socket: pick(DEFAULT_WIDGET_CONFIG.socket, raw.socket)
  }
}

export function resolveWidgetConfig(
  dashboard: WidgetConfig | null,
  overrides: Parameters<typeof resolveConfig>[1]
): ResolvedWidgetConfig {
  const source = dashboard ?? normalizeConfig({})
  return {
    ...resolveConfig(dashboard ?? undefined, overrides),
    id: source.id,
    isTest: source.isTest,
    team: source.team,
    security: source.security,
    branding: source.branding,
    socket: source.socket
  }
}

export function initialState(locale: string = 'en'): WidgetState {
  const config = resolveWidgetConfig(null, {})
  const i18n = createI18n({ locale, texts: config.texts })
  return {
    status: 'idle',
    open: false,
    launcherVisible: true,
    view: { name: 'home' },
    config,
    locale: i18n.locale,
    dir: i18n.dir,
    i18n,
    identity: ANONYMOUS,
    connection: 'idle',
    conversations: [],
    conversationsLoading: false,
    conversationsHasMore: false,
    threads: {},
    typing: {},
    pendingReply: {},
    unreadCount: 0,
    prefill: null,
    loginRequired: false,
    lastError: null,
    preview: false
  }
}

export function emptyThread(loaded: boolean = false): ThreadState {
  return { messages: [], hasMore: false, loading: false, loaded, error: null }
}

export const isLocal = (message: Message): boolean => message.id.startsWith('local:')

/** A conversation still counts as the one to reopen for a day after its last message. */
export const RECENT_CONVERSATION_MS: number = 24 * 60 * 60 * 1000

/** Newest conversation updated within the last day. `list` is newest-first. */
export function recentConversation(
  list: Conversation[],
  now: number = Date.now()
): Conversation | null {
  const latest = list[0]
  if (!latest) return null
  const updated = Date.parse(latest.updatedAt)
  if (!Number.isFinite(updated) || now - updated > RECENT_CONVERSATION_MS) return null
  return latest
}

export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
  )
}

export function upsertConversation(
  list: Conversation[],
  conversation: Conversation
): Conversation[] {
  const rest = list.filter((c) => c.id !== conversation.id)
  return sortConversations([...rest, conversation])
}

/** Bumps a conversation's preview when a newer message arrives over the socket. */
export function touchConversation(list: Conversation[], message: Message): Conversation[] | null {
  const existing = list.find((c) => c.id === message.conversationId)
  if (!existing) return null
  if (existing.lastMessage && existing.lastMessage.createdAt > message.createdAt) return list
  const updatedAt = existing.updatedAt > message.createdAt ? existing.updatedAt : message.createdAt
  return upsertConversation(list, { ...existing, lastMessage: message, updatedAt })
}

/**
 * Merges server messages into a thread: de-duplicates by `id`, replaces optimistic messages
 * that share a `clientId`, keeps server messages ordered by `createdAt`, and keeps the
 * remaining local messages last.
 */
export function mergeMessages(
  current: ThreadMessage[],
  incoming: (Message | ThreadMessage)[]
): ThreadMessage[] {
  const byId = new Map<string, ThreadMessage>()
  const local: ThreadMessage[] = []
  for (const message of current) {
    if (isLocal(message)) local.push(message)
    else byId.set(message.id, message)
  }
  const localIds = new Set(local.map((m) => m.clientId))
  const confirmed = new Set<string>()
  for (const message of incoming) {
    const next: ThreadMessage = { ...message }
    // Own messages from this tab keep showing "Sent" once the server has them.
    const own = message.clientId ? localIds.has(message.clientId) : false
    if (next.delivery === undefined && (own || byId.get(message.id)?.delivery === 'sent')) {
      next.delivery = 'sent'
    }
    byId.set(message.id, next)
    if (message.clientId) confirmed.add(message.clientId)
  }
  const server = [...byId.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  )
  return [...server, ...local.filter((m) => !(m.clientId && confirmed.has(m.clientId)))]
}

export function updateMessage(
  messages: ThreadMessage[],
  clientId: string,
  patch: (message: ThreadMessage) => ThreadMessage | null
): ThreadMessage[] {
  const out: ThreadMessage[] = []
  for (const message of messages) {
    if (message.clientId === clientId && isLocal(message)) {
      const next = patch(message)
      if (next) out.push(next)
    } else out.push(message)
  }
  return out
}

/** The newest message the server stored, for `conversation.read`. */
export function lastServerMessage(messages: ThreadMessage[]): ThreadMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message && !isLocal(message)) return message
  }
  return null
}

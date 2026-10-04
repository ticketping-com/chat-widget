import { backoffDelay, sleep } from './backoff.ts'
import { createEmitter, type Emitter } from './emitter.ts'
import { TicketpingError, isTicketpingError, isTransient, toWidgetError } from './errors.ts'
import {
  createApiClient,
  type ApiClient,
  type BootRequest,
  type BootResponse,
  type IdentifyProfile,
  type IdentifyResponse,
  type UploadOptions
} from './http.ts'
import { createI18n } from './i18n.ts'
import { createOutbox, type Outbox } from './outbox.ts'
import { browserPlatform, type Platform } from './platform.ts'
import { PREVIEW_CONVERSATION_ID, previewConversation, type PreviewView } from './preview.ts'
import { createSessionManager, type SessionManager } from './session.ts'
import {
  createSocketTransport,
  type Frame,
  type SocketTransport,
  type TransportStatus
} from './socket.ts'
import {
  ANONYMOUS,
  NEW_CONVERSATION,
  emptyThread,
  initialState,
  isLocal,
  lastServerMessage,
  mergeMessages,
  normalizeConfig,
  recentConversation,
  resolveWidgetConfig,
  sortConversations,
  touchConversation,
  updateMessage,
  upsertConversation,
  type PartialWidgetConfig,
  type ThreadMessage,
  type ThreadState,
  type ViewState,
  type WidgetState
} from './state.ts'
import { createWidgetStorage, type WidgetStorage } from './storage.ts'
import { createStore } from './store.ts'
import type {
  Attachment,
  AttributeValue,
  ConfigOverrides,
  ConsentState,
  Conversation,
  FileAttachment,
  GifPage,
  GifResult,
  Identity,
  IdentifyOptions,
  InitOptions,
  Message,
  SenderType,
  StoredVisitor,
  UpdateOptions,
  WidgetConfig,
  WidgetError,
  WidgetEvents
} from './types.ts'

export const KEY_PATTERN: RegExp = /^pk_[A-Za-z0-9]{24}$/
export const MAX_MESSAGE_LENGTH = 10_000
export const MAX_ATTACHMENTS = 5
export const MAX_UPLOAD_BYTES: number = 10 * 1024 * 1024
export const TYPING_TTL_MS = 6_000
/** Quiet period before the typing dots, matching the server's AI reply pause. */
export const REPLY_WAIT_MS = 2_000
export const TYPING_THROTTLE_MS = 2_000
/** While the visitor keeps typing, `isTyping: true` is repeated this often so it doesn't expire. */
export const TYPING_REPEAT_MS = 3_000
/** No keystroke for this long sends `isTyping: false`. */
export const TYPING_IDLE_MS = 5_000
const PAGE_SIZE = 20

const ALLOWED_TYPES = [
  /^image\/(png|jpeg|gif|webp)$/,
  /^application\/pdf$/,
  /^text\/(plain|csv)$/,
  /^application\/(msword|rtf|vnd\.ms-(excel|powerpoint)|vnd\.openxmlformats-officedocument\..+|vnd\.oasis\.opendocument\..+)$/
]

/** Client-side check of protocol 4.6 types. Empty types pass: the server sniffs content anyway. */
export function isAllowedFileType(type: string): boolean {
  return type === '' || ALLOWED_TYPES.some((pattern) => pattern.test(type))
}

export interface ControllerOptions {
  version: string
  /** `script`, `npm`, `react`, `vue`, `svelte`: the `(integration)` in `X-Ticketping-Client`. */
  integration?: string
  /** Browser globals behind an interface; defaults to the real browser, resolved lazily. */
  platform?: Platform
}

export interface SendInput {
  /** `null` starts a new conversation. */
  conversationId: string | null
  text?: string
  /** Attachments returned by `uploadFile()`, at most 5. */
  attachments?: FileAttachment[]
  gif?: GifResult
}

export interface UploadFileOptions extends UploadOptions {
  /** Defaults to `file.name`. */
  name?: string
}

export interface PreviewOptions {
  config?: PartialWidgetConfig
  view?: PreviewView
}

export interface TrackedEvent {
  name: string
  meta: Record<string, AttributeValue> | undefined
  at: string
}

/**
 * The single source of truth for the widget. The Svelte UI renders `subscribe()` (Svelte store
 * contract) and calls the actions; the public `Ticketping` API is a thin wrapper around it.
 */
export interface WidgetController {
  getState(): WidgetState
  subscribe(listener: (state: WidgetState) => void): () => void
  readonly events: Emitter<WidgetEvents>

  // Lifecycle
  init(options: InitOptions): void
  consent(state: ConsentState): void
  update(options?: UpdateOptions): void
  setLocale(locale: string): void
  setContext(attributes: Record<string, AttributeValue>): void
  /** Kept in memory only (last 100). No protocol event exists yet, so nothing is sent. */
  trackEvent(name: string, meta?: Record<string, AttributeValue>): void
  trackedEvents(): readonly TrackedEvent[]
  preview(options?: PreviewOptions): void
  destroy(): void

  // Identity
  identify(options: IdentifyOptions): Promise<void>
  logout(): Promise<void>

  // Navigation
  open(): void
  close(): void
  toggle(): void
  showLauncher(): void
  hideLauncher(): void
  navigate(view: ViewState): void
  showHome(): void
  showMessages(): void
  showConversation(conversationId: string): void
  showNewMessage(prefill?: string): void
  consumePrefill(): string | null
  clearError(): void

  // Conversations and messages
  loadMoreConversations(): Promise<void>
  loadMessages(conversationId: string): Promise<void>
  loadOlder(conversationId: string): Promise<void>
  /** Returns the message's `clientId`. Throws `TicketpingError` for invalid input. */
  send(input: SendInput): string
  retry(clientId: string): void
  discard(clientId: string): void
  markRead(conversationId: string): void
  handoff(conversationId: string): void
  setTyping(conversationId: string, isTyping: boolean): void
  saveContact(email: string): Promise<void>
  uploadFile(file: Blob, options?: UploadFileOptions): Promise<FileAttachment>
  trendingGifs(offset?: number, signal?: AbortSignal): Promise<GifPage>
  searchGifs(query: string, offset?: number, signal?: AbortSignal): Promise<GifPage>
}

interface TypingOut {
  want: boolean
  value: boolean
  sentAt: number
  timer?: ReturnType<typeof setTimeout>
  idle?: ReturnType<typeof setTimeout>
}

interface ReplyWait {
  timer: ReturnType<typeof setTimeout>
  due: number
}

/** The pieces that exist while a live (non-preview) widget runs. */
interface Live {
  pk: string
  platform: Platform
  storage: WidgetStorage
  api: ApiClient
  sessions: SessionManager
  transport: SocketTransport
  outbox: Outbox
  visitor: StoredVisitor | null
  conversationsCursor: string | null
  connectedOnce: boolean
  bootAttempts: number
  readSent: Map<string, string>
  unreadPending: Set<string>
  typingIn: Map<string, ReturnType<typeof setTimeout>>
  typingOut: Map<string, TypingOut>
  replyWait: Map<string, ReplyWait>
  pendingContext: Record<string, unknown> | null
  pendingHandoffs: Set<string>
  recovering: Promise<void> | null
  timers: Set<ReturnType<typeof setTimeout>>
  cleanups: (() => void)[]
  syncTimer?: ReturnType<typeof setTimeout>
  missingVisitorTimer?: ReturnType<typeof setTimeout>
  listTimer?: ReturnType<typeof setTimeout>
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key))
}

function normalizeIdentity(value: unknown): Identity {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Identity>
  const str = (x: unknown) => (typeof x === 'string' ? x : null)
  return {
    state: v.state === 'verified' || v.state === 'unverified' ? v.state : 'anonymous',
    userId: str(v.userId),
    name: str(v.name),
    email: str(v.email),
    contactEmail: str(v.contactEmail)
  }
}

function isMessage(value: unknown): value is Message {
  const m = value as Partial<Message> | null
  return (
    !!m &&
    typeof m.id === 'string' &&
    typeof m.conversationId === 'string' &&
    typeof m.createdAt === 'string' &&
    !!m.sender
  )
}

function isConversation(value: unknown): value is Conversation {
  const c = value as Partial<Conversation> | null
  return !!c && typeof c.id === 'string' && typeof c.updatedAt === 'string'
}

function pickOverrides(source: ConfigOverrides): ConfigOverrides {
  const out: ConfigOverrides = {}
  if (source.appearance) out.appearance = source.appearance
  if (source.texts) out.texts = source.texts
  if (source.features) out.features = source.features
  return out
}

function mergeOverrides(base: ConfigOverrides, next: ConfigOverrides): ConfigOverrides {
  const out: ConfigOverrides = { ...base }
  if (next.appearance) {
    const launcher = { ...base.appearance?.launcher, ...next.appearance.launcher }
    out.appearance = { ...base.appearance, ...next.appearance, launcher }
  }
  if (next.texts) out.texts = { ...base.texts, ...next.texts }
  if (next.features) out.features = { ...base.features, ...next.features }
  return out
}

function profileOf(options: IdentifyOptions): IdentifyProfile {
  const profile: IdentifyProfile = {}
  if (options.email !== undefined) profile.email = options.email
  if (options.name !== undefined) profile.name = options.name
  if (options.company !== undefined) profile.company = options.company
  if (options.attributes !== undefined) profile.attributes = options.attributes
  return profile
}

function gifAttachment(gif: GifResult): Attachment {
  return {
    id: `local:gif:${gif.id}`,
    kind: 'gif',
    gif: {
      provider: gif.provider,
      id: gif.id,
      title: gif.title,
      width: gif.width,
      height: gif.height,
      mp4Url: '',
      webpUrl: gif.previewUrl,
      gifUrl: gif.previewUrl,
      stillUrl: gif.stillUrl
    }
  }
}

export function createWidgetController(options: ControllerOptions): WidgetController {
  let platform: Platform | null = options.platform ?? null
  const env = (): Platform => (platform ??= browserPlatform())
  const events = createEmitter<WidgetEvents>()
  const store = createStore<WidgetState>(initialState())
  const get = store.get
  const set = store.set

  let initOptions: InitOptions | null = null
  let integration = options.integration ?? 'npm'
  let overrides: ConfigOverrides = {}
  let localeOverride: string | null = null
  let dashboard: WidgetConfig | null = null
  let consentState: ConsentState = 'granted'
  let live: Live | null = null
  /** Bumped whenever conversation data is thrown away, so stale responses are dropped. */
  let epoch = 0
  let queue: Promise<void> = Promise.resolve()
  let readyEmitted = false
  let identifyIntent: IdentifyOptions | null = null
  let appliedProfile: string | null = null
  let contextAttributes: Record<string, AttributeValue> = {}
  const warnedFeatures = new Set<string>()
  const tracked: TrackedEvent[] = []

  // -------------------------------------------------------------------------
  // Helpers

  function fail(err: unknown, log = false): void {
    const error = toWidgetError(err)
    if (log) console.error(`[Ticketping] ${error.message}`)
    set({ lastError: error })
    events.emit('error', error)
  }

  function enqueue(task: () => Promise<void>): Promise<void> {
    const run = queue.then(() => (live ? task() : undefined))
    queue = run.catch((err) => fail(err))
    return queue
  }

  function later(l: Live, fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      l.timers.delete(timer)
      if (live === l) fn()
    }, ms)
    l.timers.add(timer)
    return timer
  }

  function currentLocale(): string {
    if (localeOverride) return localeOverride
    if (initOptions?.locale) return initOptions.locale
    return platform || typeof navigator !== 'undefined' ? env().language() : 'en'
  }

  function applyConfig(): void {
    const config = resolveWidgetConfig(dashboard, overrides)
    for (const feature of config.ignoredFeatureOverrides) {
      if (warnedFeatures.has(feature)) continue
      warnedFeatures.add(feature)
      console.warn(
        `[Ticketping] features.${feature} can only be switched on in the dashboard; ignoring the code override.`
      )
    }
    const i18n = createI18n({ locale: currentLocale(), texts: config.texts })
    const state = get()
    set({
      config,
      i18n,
      locale: i18n.locale,
      dir: i18n.dir,
      loginRequired: config.security.identifiedOnly && state.identity.state === 'anonymous'
    })
  }

  function setIdentity(identity: Identity): void {
    const previous = get().identity
    set({
      identity,
      loginRequired: get().config.security.identifiedOnly && identity.state === 'anonymous'
    })
    if (previous.state !== identity.state || previous.userId !== identity.userId) {
      events.emit('identityChange', { state: identity.state, userId: identity.userId })
    }
  }

  function setUnread(total: number): void {
    const count = Math.max(0, Math.floor(total))
    if (get().unreadCount === count) return
    set({ unreadCount: count })
    events.emit('unreadCountChange', { count })
  }

  function patchThread(id: string, patch: (thread: ThreadState) => ThreadState): void {
    const threads = get().threads
    set({ threads: { ...threads, [id]: patch(threads[id] ?? emptyThread()) } })
  }

  function patchLocal(clientId: string, patch: (m: ThreadMessage) => ThreadMessage | null): void {
    const threads = { ...get().threads }
    for (const [id, thread] of Object.entries(threads)) {
      if (!thread.messages.some((m) => m.clientId === clientId && isLocal(m))) continue
      threads[id] = { ...thread, messages: updateMessage(thread.messages, clientId, patch) }
    }
    set({ threads })
  }

  function setConversations(list: Conversation[], hasMore: boolean): void {
    set({
      conversations: sortConversations(list.filter(isConversation)),
      conversationsHasMore: hasMore
    })
  }

  function clearConversationState(l: Live): void {
    for (const timer of l.typingIn.values()) clearTimeout(timer)
    for (const t of l.typingOut.values()) {
      clearTimeout(t.timer)
      clearTimeout(t.idle)
    }
    l.typingIn.clear()
    l.typingOut.clear()
    for (const wait of l.replyWait.values()) clearTimeout(wait.timer)
    l.replyWait.clear()
    l.readSent.clear()
    l.unreadPending.clear()
    l.pendingHandoffs.clear()
    l.conversationsCursor = null
    l.connectedOnce = false
    const view = get().view
    set({
      conversations: [],
      conversationsHasMore: false,
      conversationsLoading: false,
      threads: {},
      typing: {},
      pendingReply: {},
      prefill: null,
      view: view.name === 'thread' ? { name: 'home' } : view
    })
    setUnread(0)
  }

  // -------------------------------------------------------------------------
  // Live widget: start, stop, boot

  function start(): void {
    if (live || !initOptions) return
    const p = env()
    const pk = initOptions.publishableKey
    const storage = createWidgetStorage(pk, p)
    storage.enable()

    const l = { pk, platform: p, storage } as Live
    Object.assign(l, {
      visitor: null,
      conversationsCursor: null,
      connectedOnce: false,
      bootAttempts: 0,
      readSent: new Map(),
      unreadPending: new Set(),
      typingIn: new Map(),
      typingOut: new Map(),
      replyWait: new Map(),
      pendingContext: null,
      pendingHandoffs: new Set(),
      recovering: null,
      timers: new Set(),
      cleanups: []
    })

    l.api = createApiClient({
      ...(initOptions.apiUrl ? { baseUrl: initOptions.apiUrl } : {}),
      clientHeader: `widget/${options.version} (${integration})`,
      platform: p,
      credentials: () => ({
        visitorToken: l.visitor?.token ?? null,
        accessToken: l.sessions.current()?.accessToken ?? null
      }),
      onCredentialsInvalid: () => recover(l).then(() => live === l)
    })

    l.sessions = createSessionManager({
      platform: p,
      storage,
      lockName: `tp:${pk}:refresh`,
      refresh: (token) => l.api.refreshSession(token),
      onTokens: (session) => {
        l.transport.send({ type: 'auth.refresh', data: { accessToken: session.accessToken } })
      },
      onRefreshDue: () => void refreshOrRecover(l)
    })

    l.outbox = createOutbox({
      send: (frame) => l.transport.send(frame),
      onFailed: (clientId, error) => {
        patchLocal(clientId, (m) => ({ ...m, delivery: 'failed', error }))
        for (const [id, thread] of Object.entries(get().threads)) {
          if (!thread.messages.some((m) => m.clientId === clientId)) continue
          const stillWaiting = thread.messages.some(
            (m) => m.delivery === 'sending' || m.delivery === 'sent'
          )
          if (!stillWaiting) clearReplyWait(l, id)
        }
      },
      onAckTimeout: () => {
        if (l.transport.status === 'open') l.transport.reconnect()
      }
    })

    l.transport = createSocketTransport({
      platform: p,
      url: () => get().config.socket.url,
      heartbeatSeconds: () => get().config.socket.heartbeatSeconds,
      auth: () => {
        if (!l.visitor) return null
        const access = l.sessions.current()?.accessToken
        return access
          ? { publishableKey: pk, visitorToken: l.visitor.token, accessToken: access }
          : { publishableKey: pk, visitorToken: l.visitor.token }
      },
      onAuthOk: (data) => onAuthOk(l, data),
      onFrame: (frame) => onFrame(l, frame),
      onStatus: (status) => onTransportStatus(l, status),
      onDisconnect: () => l.outbox.disconnected(),
      onFatal: (error) => fail(error, true),
      recover: (reason, attempt) => recoverSocket(l, reason, attempt),
      hasPending: () => l.outbox.size > 0
    })

    l.cleanups.push(
      storage.onChange((name) => onStorageChange(l, name)),
      p.onVisibilityChange(() => {
        if (p.isHidden()) return
        if (l.sessions.expiresSoon()) void refreshOrRecover(l)
        autoMarkRead()
      })
    )

    live = l
    set({ status: 'booting' })
    void enqueue(() => boot(l, true))
    if (identifyIntent) {
      const intent = identifyIntent
      void enqueue(() => applyIdentify(l, intent))
    }
  }

  function stopLive(): void {
    const l = live
    if (!l) return
    live = null
    epoch++
    l.transport.stop()
    l.sessions.clear()
    l.outbox.clear()
    for (const timer of l.timers) clearTimeout(timer)
    for (const cleanup of l.cleanups) cleanup()
    clearTimeout(l.syncTimer)
    clearTimeout(l.missingVisitorTimer)
    clearTimeout(l.listTimer)
    clearConversationState(l)
    l.storage.disable()
    appliedProfile = null
    setIdentity(ANONYMOUS)
    set({ status: 'idle', connection: 'idle', open: false })
  }

  async function boot(l: Live, connect: boolean): Promise<void> {
    const myEpoch = epoch
    const stale = () => live !== l || epoch !== myEpoch
    l.visitor = l.storage.readVisitor()
    let stored = l.storage.readSession()
    if (stored && Date.parse(stored.refreshExpiresAt) <= Date.now()) {
      l.storage.writeSession(null)
      stored = null
    }
    if (get().status !== 'ready') set({ status: 'booting' })

    const body: BootRequest = {
      publishableKey: l.pk,
      page: l.platform.page(),
      locale: get().locale,
      client: { version: options.version, integration }
    }
    if (l.visitor) body.visitorToken = l.visitor.token

    let res: BootResponse
    try {
      res = await l.api.boot(body)
    } catch (err) {
      if (!stale()) bootFailed(l, err, connect)
      return
    }
    if (stale()) return
    l.bootAttempts = 0

    const issued = res.visitor?.token
    if (issued) {
      // A new visitor means the stored session belonged to someone the server no longer knows.
      if (l.visitor && l.visitor.token !== issued && stored) {
        l.storage.writeSession(null)
        stored = null
      }
      l.visitor = { token: issued, visitorId: res.visitor.id }
      l.storage.writeVisitor(l.visitor)
    } else if (l.visitor) {
      if (l.visitor.visitorId !== res.visitor?.id) {
        l.visitor = { token: l.visitor.token, visitorId: String(res.visitor?.id ?? '') }
        l.storage.writeVisitor(l.visitor)
      }
    } else {
      fail(new TicketpingError('invalid_response', 'boot returned no visitor token.'), true)
      set({ status: 'failed' })
      return
    }

    dashboard = normalizeConfig(res.config)
    applyConfig()
    const conversations = Array.isArray(res.conversations) ? res.conversations : []
    setConversations(conversations, conversations.length >= PAGE_SIZE)
    setIdentity(normalizeIdentity(res.identity))
    setUnread(typeof res.unreadCount === 'number' ? res.unreadCount : 0)

    if (stored) {
      l.sessions.adopt(stored)
      setIdentity({ ...get().identity, state: 'verified', userId: stored.userId })
      if (l.sessions.expiresSoon()) await refreshOrRecover(l)
      if (stale()) return
      if (l.sessions.current()) await refreshConversations(l).catch(() => undefined)
      if (stale()) return
    }

    set({ status: 'ready' })
    if (!readyEmitted) {
      readyEmitted = true
      events.emit('ready', undefined)
    }
    if (connect) void enqueue(async () => connectSocket(l))
  }

  function bootFailed(l: Live, err: unknown, connect: boolean): void {
    if (isTransient(err) || isTicketpingError(err, 'rate_limited')) {
      l.bootAttempts++
      if (l.bootAttempts === 1) fail(err)
      const retryAfter =
        err instanceof TicketpingError && err.retryAfter ? err.retryAfter * 1000 : 0
      const delay = Math.max(
        retryAfter,
        1000 + backoffDelay(l.bootAttempts, l.platform.random, 1000)
      )
      later(l, () => void enqueue(() => boot(l, connect)), delay)
      return
    }
    set({ status: 'failed' })
    fail(err, true)
  }

  async function refreshConversations(l: Live): Promise<void> {
    const myEpoch = epoch
    const page = await l.api.listConversations()
    if (live !== l || epoch !== myEpoch) return
    l.conversationsCursor = page.nextCursor ?? null
    // Keep conversations created locally since the request started.
    const ids = new Set(page.conversations.map((c) => c.id))
    const extra = get().conversations.filter((c) => !ids.has(c.id) && get().threads[c.id])
    setConversations([...page.conversations, ...extra], !!page.nextCursor)
  }

  function scheduleListRefresh(l: Live): void {
    clearTimeout(l.listTimer)
    l.listTimer = setTimeout(() => {
      if (live === l) void refreshConversations(l).catch(() => undefined)
    }, 500)
  }

  // -------------------------------------------------------------------------
  // Identity (protocol 4.2, 4.8, 6.5, 6.6)

  async function applyIdentify(l: Live, o: IdentifyOptions): Promise<void> {
    if (live !== l || get().status === 'failed') return
    const userId = o.userId === undefined || o.userId === null ? undefined : String(o.userId)
    const session = l.sessions.current()

    if (o.getToken) {
      if (session && userId !== undefined && userId === session.userId) {
        connectSocket(l)
        return
      }
      if (session && userId !== undefined) await resetVisitor(l, true, false)
      await signedIdentify(l, o, o.getToken, false)
    } else if (get().config.security.requireVerifiedIdentity) {
      fail(
        {
          code: 'verified_identity_required',
          message: 'This widget requires verified identity: pass getToken to identify().'
        },
        true
      )
    } else if (!session || (userId !== undefined && userId !== session.userId)) {
      const key = JSON.stringify([userId ?? null, profileOf(o)])
      const previousUser = appliedProfile
        ? (JSON.parse(appliedProfile) as [string | null])[0]
        : null
      if (session || (previousUser && userId && previousUser !== userId)) {
        await resetVisitor(l, true, false)
      }
      if (appliedProfile !== key && live === l) {
        try {
          const res = await l.api.identify({ profile: profileOf(o) })
          if (live === l) {
            appliedProfile = key
            setIdentity(normalizeIdentity(res.identity))
          }
        } catch (err) {
          if (live === l) fail(err, true)
        }
      }
    }
    connectSocket(l)
  }

  async function signedIdentify(
    l: Live,
    o: IdentifyOptions,
    getToken: () => Promise<string>,
    retried: boolean
  ): Promise<boolean> {
    let token: unknown
    try {
      token = await getToken()
    } catch (err) {
      if (live === l) {
        const reason = err instanceof Error ? err.message : String(err)
        fail({ code: 'get_token_failed', message: `getToken() failed: ${reason}` }, true)
      }
      return false
    }
    if (live !== l) return false
    if (typeof token !== 'string' || !token.trim()) {
      fail(
        { code: 'get_token_failed', message: 'getToken() must resolve to the token string.' },
        true
      )
      return false
    }
    try {
      const res = await l.api.identify({ token: token.trim() })
      if (live !== l) return false
      applyIdentified(l, res, o)
      return true
    } catch (err) {
      if (live !== l) return false
      if (!retried && isTicketpingError(err, 'visitor_bound_to_other_user')) {
        await resetVisitor(l, true, false)
        return signedIdentify(l, o, getToken, true)
      }
      if (!retried && isTicketpingError(err, 'credentials_invalid')) {
        await resetVisitor(l, false, false)
        return signedIdentify(l, o, getToken, true)
      }
      if (!retried && isTransient(err)) {
        await sleep(1000)
        return live === l ? signedIdentify(l, o, getToken, true) : false
      }
      fail(err, true)
      return false
    }
  }

  function applyIdentified(l: Live, res: IdentifyResponse, o: IdentifyOptions): void {
    const identity = normalizeIdentity(res.identity)
    if (res.session) {
      l.sessions.set({ ...res.session, userId: identity.userId ?? String(o.userId ?? '') })
    }
    setIdentity(identity)
    if (Array.isArray(res.conversations)) {
      l.conversationsCursor = null
      setConversations(res.conversations, res.conversations.length >= PAGE_SIZE)
    }
    if (typeof res.unreadCount === 'number') setUnread(res.unreadCount)
    l.transport.reconnect()
  }

  /** Logout (4.8) or user switch (6.5): revoke, forget everything, boot a fresh visitor. */
  async function resetVisitor(l: Live, revoke: boolean, connect: boolean): Promise<void> {
    const session = l.sessions.current()
    epoch++
    l.sessions.clear()
    l.transport.stop()
    l.transport.cursor = null
    l.outbox.clear()
    clearConversationState(l)
    if (revoke && session) {
      await l.api.logout(session.accessToken, session.refreshToken).catch(() => undefined)
    }
    l.storage.writeSession(null)
    l.storage.writeVisitor(null)
    l.visitor = null
    appliedProfile = null
    setIdentity(ANONYMOUS)
    if (live === l) await boot(l, connect)
  }

  async function refreshOrRecover(l: Live): Promise<void> {
    const result = await l.sessions.refresh()
    if (result === 'failed' && live === l && l.sessions.current()) await recover(l, true)
  }

  /** `401 credentials_invalid` (protocol 2.4, 6.6): refresh, re-identify, or start over anonymous. */
  function recover(l: Live, skipRefresh = false): Promise<void> {
    l.recovering ??= (async () => {
      const had = l.sessions.current()
      if (had && !skipRefresh && (await l.sessions.refresh()) !== 'failed') return
      if (live !== l) return
      const intent = identifyIntent
      if (had && intent?.getToken) {
        l.sessions.clear()
        l.storage.writeSession(null)
        if (await signedIdentify(l, intent, intent.getToken, false)) {
          connectSocket(l)
          return
        }
      }
      if (live !== l) return
      await resetVisitor(l, false, true)
      fail({
        code: 'session_lost',
        message: 'The widget session ended; continuing as a new anonymous visitor.'
      })
      if (intent && !intent.getToken && live === l) await applyIdentify(l, intent)
    })().finally(() => {
      l.recovering = null
    })
    return l.recovering
  }

  async function recoverSocket(
    l: Live,
    reason: 'credentials_invalid' | 'access_expired',
    attempt: number
  ): Promise<boolean> {
    if (reason === 'access_expired' && attempt === 1 && l.sessions.current()) {
      if ((await l.sessions.refresh()) !== 'failed') return live === l
      await recover(l, true)
      return live === l
    }
    await recover(l, attempt > 1)
    return live === l
  }

  // Another tab logged out, switched user, identified or refreshed (protocol 6.5, 6.6).
  function onStorageChange(l: Live, name: string): void {
    if (name !== 'visitor' && name !== 'session') return
    clearTimeout(l.syncTimer)
    l.syncTimer = setTimeout(() => syncFromStorage(l), 250)
  }

  function syncFromStorage(l: Live): void {
    if (live !== l) return
    const visitor = l.storage.readVisitor()
    const stored = l.storage.readSession()
    const current = l.sessions.current()
    clearTimeout(l.missingVisitorTimer)
    if (!visitor) {
      // The other tab is mid-logout; give it time to boot and store its new visitor.
      l.missingVisitorTimer = setTimeout(() => {
        if (live === l && !l.storage.readVisitor()) void enqueue(() => follow(l))
      }, 3000)
      return
    }
    if (l.visitor && visitor.token === l.visitor.token) {
      if (stored && current && stored.userId === current.userId) {
        if (stored.refreshToken !== current.refreshToken) {
          l.sessions.adopt(stored)
          l.transport.send({ type: 'auth.refresh', data: { accessToken: stored.accessToken } })
        }
        return
      }
      if (!stored && !current) return
    }
    void enqueue(() => follow(l))
  }

  async function follow(l: Live): Promise<void> {
    epoch++
    l.sessions.clear()
    l.transport.stop()
    l.transport.cursor = null
    l.outbox.clear()
    clearConversationState(l)
    l.visitor = null
    appliedProfile = null
    setIdentity(ANONYMOUS)
    await boot(l, true)
  }

  // -------------------------------------------------------------------------
  // Socket events (protocol 6.2)

  function onTransportStatus(l: Live, status: TransportStatus): void {
    if (live !== l) return
    const connection =
      status === 'open'
        ? 'online'
        : status === 'idle'
          ? 'idle'
          : status === 'stopped'
            ? 'offline'
            : l.connectedOnce
              ? 'reconnecting'
              : 'connecting'
    set({ connection })
  }

  function onAuthOk(l: Live, data: Record<string, unknown>): void {
    if (data.identity && typeof data.identity === 'object') {
      setIdentity(normalizeIdentity(data.identity))
    }
    l.connectedOnce = true
    set({ connection: 'online' })
    l.outbox.flush()
    if (l.pendingContext) {
      const context = l.pendingContext
      if (l.transport.send({ type: 'visitor.context', data: context })) l.pendingContext = null
    }
    for (const conversationId of l.pendingHandoffs) {
      if (l.transport.send({ type: 'conversation.handoff', data: { conversationId } })) {
        l.pendingHandoffs.delete(conversationId)
      }
    }
    autoMarkRead()
  }

  function onFrame(l: Live, frame: Frame): void {
    const data = frame.data
    switch (frame.type) {
      case 'message.created':
        if (isMessage(data.message)) onMessage(l, data.message)
        return
      case 'conversation.updated':
        if (isConversation(data.conversation)) {
          const conversation = data.conversation
          set({ conversations: upsertConversation(get().conversations, conversation) })
          const last = conversation.lastMessage
          const thread = last && get().threads[last.conversationId]
          if (conversation.phase !== 'ai') clearReplyWait(l, conversation.id)
          if (isMessage(last) && !thread?.messages.some((m) => m.id === last.id)) {
            onMessage(l, last)
          }
          autoMarkRead()
        }
        return
      case 'typing':
        return onTyping(l, data)
      case 'unread.updated':
        if (typeof data.total === 'number') setUnread(data.total)
        return
      case 'sync.reset':
        void resync(l)
        return
      case 'ack':
        return onAck(l, data)
      case 'error':
        return onErrorFrame(l, frame)
    }
  }

  /** Moves the not-yet-created conversation's messages under its real ID. */
  function adoptNewConversation(conversationId: string): void {
    const state = get()
    const pending = state.threads[NEW_CONVERSATION]
    if (!pending) return
    const threads = omit(state.threads, NEW_CONVERSATION)
    const existing = threads[conversationId] ?? emptyThread(true)
    const moved = pending.messages.map((m) => ({ ...m, conversationId }))
    const adopted: ThreadState = {
      ...existing,
      loaded: true,
      messages: mergeMessages([...existing.messages, ...moved], [])
    }
    if (pending.greeting === true || existing.greeting === true) adopted.greeting = true
    threads[conversationId] = adopted
    const view: ViewState =
      state.view.name === 'thread' && state.view.conversationId === null
        ? { name: 'thread', conversationId }
        : state.view
    const pendingReply = { ...state.pendingReply }
    if (pendingReply[NEW_CONVERSATION]) {
      set({
        threads,
        view,
        pendingReply: { ...omit(pendingReply, NEW_CONVERSATION), [conversationId]: true }
      })
    } else {
      set({ threads, view, pendingReply })
    }
    if (live) moveReplyWait(live, NEW_CONVERSATION, conversationId)
  }

  function addServerMessage(message: ThreadMessage): void {
    const state = get()
    const thread = state.threads[message.conversationId] ?? emptyThread(false)
    const threads = {
      ...state.threads,
      [message.conversationId]: {
        ...thread,
        messages: mergeMessages(thread.messages, [message])
      }
    }
    const conversations = touchConversation(state.conversations, message)
    set(conversations ? { threads, conversations } : { threads })
    if (!conversations && live) scheduleListRefresh(live)
  }

  function onMessage(l: Live, message: Message): void {
    const state = get()
    const pending = state.threads[NEW_CONVERSATION]
    const echoesPending =
      !!message.clientId && !!pending?.messages.some((m) => m.clientId === message.clientId)
    const knownConversation =
      state.conversations.some((c) => c.id === message.conversationId) ||
      !!state.threads[message.conversationId]
    const replyWhileStarting =
      state.view.name === 'thread' &&
      state.view.conversationId === null &&
      !!pending &&
      message.sender.type !== 'USER' &&
      !knownConversation
    if (echoesPending || replyWhileStarting) adoptNewConversation(message.conversationId)
    const seen =
      get().threads[message.conversationId]?.messages.some((m) => m.id === message.id) ||
      state.conversations.find((c) => c.id === message.conversationId)?.lastMessage?.id ===
        message.id
    addServerMessage(message)
    if (message.sender.type === 'USER') return
    clearTyping(l, message.conversationId)
    clearReplyWait(l, message.conversationId)
    if (seen) return
    l.unreadPending.add(message.conversationId)
    events.emit('messageReceived', {
      conversationId: message.conversationId,
      messageId: message.id
    })
    autoMarkRead()
  }

  function onAck(l: Live, data: Record<string, unknown>): void {
    const clientId = typeof data.clientId === 'string' ? data.clientId : null
    if (!clientId || !isMessage(data.message)) return
    const message = data.message
    const sent = l.outbox.ack(clientId, message.conversationId)
    const startedHere = sent?.conversationId === null
    if (isConversation(data.conversation)) {
      set({ conversations: upsertConversation(get().conversations, data.conversation) })
    }
    if (get().threads[NEW_CONVERSATION]?.messages.some((m) => m.clientId === clientId)) {
      adoptNewConversation(message.conversationId)
    }
    addServerMessage({ ...message, clientId, delivery: 'sent' })
    if (!sent) return
    if (startedHere) events.emit('conversationStarted', { conversationId: message.conversationId })
    events.emit('messageSent', { conversationId: message.conversationId, messageId: message.id })
  }

  function onErrorFrame(l: Live, frame: Frame): void {
    const raw = (frame.data.error ?? {}) as Partial<WidgetError>
    const error: WidgetError = {
      code: typeof raw.code === 'string' ? raw.code : 'unknown_error',
      message: typeof raw.message === 'string' ? raw.message : 'The server rejected a request.'
    }
    const clientId = typeof frame.data.clientId === 'string' ? frame.data.clientId : frame.id
    if (error.code === 'identified_only') set({ loginRequired: true })
    if (clientId && l.outbox.has(clientId)) {
      l.outbox.reject(clientId, error)
      return
    }
    console.error(`[ticketping] ${error.code}: ${error.message}`)
    fail(error)
  }

  function clearReplyWait(l: Live, conversationId: string): void {
    const existing = l.replyWait.get(conversationId)
    if (existing) clearTimeout(existing.timer)
    l.replyWait.delete(conversationId)
    const pending = get().pendingReply
    if (!pending[conversationId]) return
    set({ pendingReply: omit(pending, conversationId) })
  }

  function armReplyWait(l: Live, conversationId: string, delay: number = REPLY_WAIT_MS): void {
    const existing = l.replyWait.get(conversationId)
    if (existing) clearTimeout(existing.timer)
    const due = Date.now() + delay
    const timer = setTimeout(() => {
      l.replyWait.delete(conversationId)
      if (live !== l) return
      set({ pendingReply: { ...get().pendingReply, [conversationId]: true } })
    }, delay)
    l.replyWait.set(conversationId, { timer, due })
  }

  function moveReplyWait(l: Live, from: string, to: string): void {
    const existing = l.replyWait.get(from)
    if (!existing) return
    clearTimeout(existing.timer)
    l.replyWait.delete(from)
    armReplyWait(l, to, Math.max(0, existing.due - Date.now()))
  }

  function clearTyping(l: Live, conversationId: string): void {
    clearTimeout(l.typingIn.get(conversationId))
    l.typingIn.delete(conversationId)
    const typing = get().typing
    if (!typing[conversationId]) return
    set({ typing: omit(typing, conversationId) })
  }

  function onTyping(l: Live, data: Record<string, unknown>): void {
    const conversationId = data.conversationId
    const sender = data.sender as { type?: unknown; name?: unknown } | undefined
    if (typeof conversationId !== 'string' || !sender || sender.type === 'USER') return
    if (data.isTyping !== true) return clearTyping(l, conversationId)
    clearTimeout(l.typingIn.get(conversationId))
    l.typingIn.set(
      conversationId,
      setTimeout(() => clearTyping(l, conversationId), TYPING_TTL_MS)
    )
    set({
      typing: {
        ...get().typing,
        [conversationId]: {
          sender: {
            type: sender.type as SenderType,
            name: typeof sender.name === 'string' ? sender.name : null
          }
        }
      }
    })
  }

  async function resync(l: Live): Promise<void> {
    const myEpoch = epoch
    await refreshConversations(l).catch(() => undefined)
    for (const [id, thread] of Object.entries(get().threads)) {
      if (id === NEW_CONVERSATION || !thread.loaded) continue
      try {
        const page = await l.api.listMessages(id)
        if (live !== l || epoch !== myEpoch) return
        patchThread(id, (t) => ({
          ...t,
          hasMore: page.hasMore,
          messages: mergeMessages(t.messages.filter(isLocal), page.messages)
        }))
      } catch {
        // The thread keeps what it has; the next open refetches.
      }
    }
  }

  function autoMarkRead(): void {
    const state = get()
    if (!live || !state.open || state.view.name !== 'thread' || !state.view.conversationId) return
    if (live.platform.isHidden()) return
    controller.markRead(state.view.conversationId)
  }

  /** `visitor.context` always carries every attribute set so far; the latest unsent one wins. */
  function sendContext(page: UpdateOptions['page']): void {
    const l = live
    if (!l) return
    const current = l.platform.page()
    const data: Record<string, unknown> = {
      page: { url: page?.url ?? current.url, title: page?.title ?? current.title }
    }
    if (Object.keys(contextAttributes).length > 0) data.attributes = { ...contextAttributes }
    l.pendingContext = l.transport.send({ type: 'visitor.context', data }) ? null : data
  }

  function connectSocket(l: Live): void {
    if (live !== l || get().status !== 'ready') return
    l.transport.start()
    l.transport.wake()
  }

  function pumpTyping(l: Live, conversationId: string): void {
    const t = l.typingOut.get(conversationId)
    if (!t) return
    clearTimeout(t.timer)
    const now = Date.now()
    const due = t.want ? !t.value || now - t.sentAt >= TYPING_REPEAT_MS : t.value
    if (!due) return
    const wait = t.sentAt + TYPING_THROTTLE_MS - now
    if (wait > 0) {
      t.timer = setTimeout(() => pumpTyping(l, conversationId), wait)
      return
    }
    if (l.transport.send({ type: 'typing', data: { conversationId, isTyping: t.want } })) {
      t.value = t.want
      t.sentAt = now
    } else if (!t.want) {
      t.value = false
    }
  }

  /** Launcher open only. Home is a tab, never the screen the widget starts on. */
  function enterLiveChat(): void {
    const state = get()
    if (state.preview || state.view.name !== 'home') return
    const recent = recentConversation(state.conversations)
    set({
      view: recent
        ? { name: 'thread', conversationId: recent.id }
        : { name: 'thread', conversationId: null }
    })
  }

  function setOpen(open: boolean): void {
    const state = get()
    if ((!initOptions && !state.preview) || state.open === open) return
    set({ open })
    events.emit(open ? 'open' : 'close', undefined)
    if (open && state.view.name === 'thread' && state.view.conversationId) {
      void controller.loadMessages(state.view.conversationId)
    }
    autoMarkRead()
  }

  function requireLive(): Live {
    if (!live)
      throw new TicketpingError('not_ready', 'The widget is not running: call init() first.')
    return live
  }

  // -------------------------------------------------------------------------
  // Public controller

  const controller: WidgetController = {
    getState: get,
    subscribe: store.subscribe,
    events,

    init(next) {
      if (get().preview) {
        console.warn('[Ticketping] init() is ignored while a preview is mounted.')
        return
      }
      if (initOptions) {
        console.warn('[Ticketping] init() was already called; ignoring the second call.')
        return
      }
      if (!next || !KEY_PATTERN.test(next.publishableKey ?? '')) {
        fail(
          {
            code: 'invalid_publishable_key',
            message: 'init() needs the publishableKey ("pk_...") shown in the dashboard.'
          },
          true
        )
        return
      }
      initOptions = next
      if (next.integration) integration = next.integration
      overrides = pickOverrides(next)
      consentState = next.consent ?? consentState
      set({ launcherVisible: !next.hideLauncher })
      applyConfig()
      if (consentState === 'granted') start()
      else set({ status: 'consent_pending' })
    },

    consent(state) {
      if (state !== 'granted' && state !== 'denied' && state !== 'pending') return
      consentState = state
      if (!initOptions) return
      if (state === 'granted') {
        start()
        return
      }
      const pk = initOptions.publishableKey
      stopLive()
      if (state === 'denied') createWidgetStorage(pk, env()).clear()
      set({ status: 'consent_pending' })
    },

    update(next = {}) {
      const configPart = pickOverrides(next)
      if (Object.keys(configPart).length > 0) overrides = mergeOverrides(overrides, configPart)
      if (next.hideLauncher !== undefined) set({ launcherVisible: !next.hideLauncher })
      if (next.locale) localeOverride = next.locale
      if (Object.keys(configPart).length > 0 || next.locale) applyConfig()
      if (next.attributes) contextAttributes = { ...contextAttributes, ...next.attributes }
      if (next.page || next.attributes || Object.keys(next).length === 0) sendContext(next.page)
    },

    setLocale(locale) {
      if (typeof locale !== 'string' || !locale) return
      localeOverride = locale
      applyConfig()
    },

    setContext(attributes) {
      if (!attributes || typeof attributes !== 'object') return
      contextAttributes = { ...contextAttributes, ...attributes }
      sendContext(undefined)
    },

    trackEvent(name, meta) {
      if (typeof name !== 'string' || !name) return
      tracked.push({ name, meta, at: new Date().toISOString() })
      if (tracked.length > 100) tracked.shift()
    },

    trackedEvents: () => tracked,

    preview(input = {}) {
      if (live) stopLive()
      const wasPreview = get().preview
      dashboard = normalizeConfig(input.config ?? {})
      overrides = {}
      const view = input.view ?? 'home'
      const patch: Partial<WidgetState> = {
        preview: true,
        status: 'preview',
        connection: 'online',
        open: view !== 'launcher',
        view:
          view === 'thread'
            ? { name: 'thread', conversationId: PREVIEW_CONVERSATION_ID }
            : { name: 'home' }
      }
      if (!wasPreview) {
        const sample = previewConversation()
        patch.conversations = [sample.conversation]
        patch.threads = {
          [PREVIEW_CONVERSATION_ID]: { ...emptyThread(true), messages: sample.messages }
        }
        patch.identity = ANONYMOUS
        patch.unreadCount = 0
      }
      set(patch)
      applyConfig()
      if (!readyEmitted) {
        readyEmitted = true
        events.emit('ready', undefined)
      }
    },

    destroy() {
      stopLive()
      initOptions = null
      consentState = 'granted'
      identifyIntent = null
      appliedProfile = null
      dashboard = null
      overrides = {}
      localeOverride = null
      contextAttributes = {}
      readyEmitted = false
      warnedFeatures.clear()
      tracked.length = 0
      store.set(initialState(get().locale))
      events.clear()
    },

    identify(next) {
      if (!next || typeof next !== 'object') return Promise.resolve()
      if (get().preview) return Promise.resolve()
      identifyIntent = next
      const l = live
      return l ? enqueue(() => applyIdentify(l, next)) : Promise.resolve()
    },

    logout() {
      identifyIntent = null
      const l = live
      if (!l) return Promise.resolve()
      return enqueue(async () => {
        if (!l.sessions.current() && get().identity.state === 'anonymous') return
        await resetVisitor(l, true, true)
      })
    },

    open() {
      if (!get().open) enterLiveChat()
      setOpen(true)
    },
    close: () => setOpen(false),
    toggle() {
      if (!get().open) enterLiveChat()
      setOpen(!get().open)
    },
    showLauncher: () => set({ launcherVisible: true }),
    hideLauncher: () => set({ launcherVisible: false }),

    navigate(view) {
      set({ view })
      if (view.name === 'thread' && view.conversationId) {
        void controller.loadMessages(view.conversationId)
      }
      autoMarkRead()
    },
    showHome() {
      controller.navigate({ name: 'home' })
      setOpen(true)
    },
    showMessages() {
      controller.navigate({ name: 'messages' })
      setOpen(true)
    },
    showConversation(conversationId) {
      if (typeof conversationId !== 'string' || !conversationId) return
      controller.navigate({ name: 'thread', conversationId })
      setOpen(true)
    },
    showNewMessage(prefill) {
      set({ prefill: typeof prefill === 'string' && prefill ? prefill : null })
      controller.navigate({ name: 'thread', conversationId: null })
      setOpen(true)
    },
    consumePrefill() {
      const prefill = get().prefill
      if (prefill !== null) set({ prefill: null })
      return prefill
    },
    clearError: () => set({ lastError: null }),

    async loadMoreConversations() {
      const l = live
      const state = get()
      if (!l || !state.conversationsHasMore || state.conversationsLoading) return
      const myEpoch = epoch
      set({ conversationsLoading: true })
      try {
        if (l.conversationsCursor === null) {
          // `boot` returns the first page without a cursor; fetch it to learn where page two starts.
          const first = await l.api.listConversations()
          if (live !== l || epoch !== myEpoch) return
          l.conversationsCursor = first.nextCursor ?? null
          let list = get().conversations
          for (const c of first.conversations) list = upsertConversation(list, c)
          set({ conversations: list })
        }
        if (l.conversationsCursor !== null) {
          const page = await l.api.listConversations(l.conversationsCursor)
          if (live !== l || epoch !== myEpoch) return
          l.conversationsCursor = page.nextCursor ?? null
          let list = get().conversations
          for (const c of page.conversations) list = upsertConversation(list, c)
          set({ conversations: list })
        }
        set({ conversationsHasMore: l.conversationsCursor !== null })
      } catch (err) {
        if (live === l && epoch === myEpoch) set({ lastError: toWidgetError(err) })
      } finally {
        if (live === l && epoch === myEpoch) set({ conversationsLoading: false })
      }
    },

    async loadMessages(conversationId) {
      const l = live
      if (!l || conversationId === NEW_CONVERSATION) return
      const thread = get().threads[conversationId]
      if (thread?.loaded || thread?.loading) return
      const myEpoch = epoch
      patchThread(conversationId, (t) => ({ ...t, loading: true, error: null }))
      try {
        const page = await l.api.listMessages(conversationId)
        if (live !== l || epoch !== myEpoch) return
        patchThread(conversationId, (t) => ({
          ...t,
          loading: false,
          loaded: true,
          hasMore: page.hasMore,
          messages: mergeMessages(t.messages, page.messages)
        }))
        autoMarkRead()
      } catch (err) {
        if (live !== l || epoch !== myEpoch) return
        patchThread(conversationId, (t) => ({ ...t, loading: false, error: toWidgetError(err) }))
      }
    },

    async loadOlder(conversationId) {
      const l = live
      const thread = get().threads[conversationId]
      if (!l || !thread?.loaded || !thread.hasMore || thread.loading) return
      const oldest = thread.messages.find((m) => !isLocal(m))
      if (!oldest) return
      const myEpoch = epoch
      patchThread(conversationId, (t) => ({ ...t, loading: true, error: null }))
      try {
        const page = await l.api.listMessages(conversationId, oldest.id)
        if (live !== l || epoch !== myEpoch) return
        patchThread(conversationId, (t) => ({
          ...t,
          loading: false,
          hasMore: page.hasMore,
          messages: mergeMessages(t.messages, page.messages)
        }))
      } catch (err) {
        if (live !== l || epoch !== myEpoch) return
        patchThread(conversationId, (t) => ({ ...t, loading: false, error: toWidgetError(err) }))
      }
    },

    send(input) {
      const state = get()
      const text = (input.text ?? '').trim()
      const attachments = input.attachments ?? []
      if (!text && attachments.length === 0 && !input.gif) {
        throw new TicketpingError('message_empty', 'A message needs text, an attachment or a GIF.')
      }
      if (text.length > MAX_MESSAGE_LENGTH) {
        throw new TicketpingError(
          'message_too_long',
          `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`,
          {
            details: { max: MAX_MESSAGE_LENGTH }
          }
        )
      }
      if (attachments.length > MAX_ATTACHMENTS) {
        throw new TicketpingError(
          'too_many_attachments',
          `At most ${MAX_ATTACHMENTS} attachments per message.`,
          {
            details: { max: MAX_ATTACHMENTS }
          }
        )
      }
      if (input.gif && !state.config.features.gifs) {
        throw new TicketpingError('feature_disabled', 'GIFs are switched off.', {
          details: { feature: 'gifs' }
        })
      }
      if (state.loginRequired) {
        throw new TicketpingError('identified_only', 'Log in to send messages.')
      }
      if (!live && !state.preview) requireLive()

      const clientId = env().uuid()
      const key = input.conversationId ?? NEW_CONVERSATION
      const message: ThreadMessage = {
        id: `local:${clientId}`,
        conversationId: input.conversationId ?? '',
        clientId,
        createdAt: new Date().toISOString(),
        sender: { type: 'USER', name: state.identity.name, avatarUrl: null },
        kind: 'message',
        body: { format: 'text', content: text },
        attachments: [...attachments, ...(input.gif ? [gifAttachment(input.gif)] : [])],
        event: null,
        delivery: state.preview ? 'sent' : 'sending'
      }
      patchThread(key, (t) => {
        const next: ThreadState = {
          ...t,
          loaded: t.loaded || input.conversationId === null,
          messages: [
            ...t.messages,
            state.preview ? { ...message, id: `preview:${clientId}` } : message
          ]
        }
        if (input.conversationId === null) next.greeting = true
        return next
      })
      if (state.preview) return clientId

      const l = live
      if (!l) return clientId
      l.outbox.add({
        clientId,
        conversationId: input.conversationId,
        text,
        attachmentIds: attachments.map((a) => a.id),
        ...(input.gif ? { gif: { provider: input.gif.provider, id: input.gif.id } } : {})
      })
      l.outbox.flush()
      l.transport.wake()
      if (input.conversationId) controller.setTyping(input.conversationId, false)
      if (state.config.features.ai) {
        const phase = input.conversationId
          ? state.conversations.find((item) => item.id === input.conversationId)?.phase
          : 'ai'
        if (!input.conversationId || phase === 'ai') armReplyWait(l, key)
      }
      return clientId
    },

    retry(clientId) {
      const l = live
      if (!l || !l.outbox.retry(clientId)) return
      patchLocal(clientId, (m) => {
        const next: ThreadMessage = { ...m, delivery: 'sending' }
        delete next.error
        return next
      })
      l.transport.wake()
    },

    discard(clientId) {
      live?.outbox.remove(clientId)
      patchLocal(clientId, () => null)
    },

    markRead(conversationId) {
      const state = get()
      const conversation = state.conversations.find((c) => c.id === conversationId)
      if (!conversation) return
      const l = live
      if (l) {
        const thread = state.threads[conversationId]
        const last = (thread && lastServerMessage(thread.messages)) ?? conversation.lastMessage
        if (!last || (conversation.unreadCount === 0 && !l.unreadPending.has(conversationId)))
          return
        if (l.readSent.get(conversationId) !== last.id) {
          const sent = l.transport.send({
            type: 'conversation.read',
            data: { conversationId, upToMessageId: last.id }
          })
          if (!sent) return
          l.readSent.set(conversationId, last.id)
        }
        l.unreadPending.delete(conversationId)
      }
      if (conversation.unreadCount > 0) {
        set({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          )
        })
        setUnread(state.unreadCount - conversation.unreadCount)
      }
    },

    handoff(conversationId) {
      const l = live
      if (!l || !conversationId) return
      if (!l.transport.send({ type: 'conversation.handoff', data: { conversationId } })) {
        l.pendingHandoffs.add(conversationId)
        l.transport.wake()
      }
    },

    setTyping(conversationId, isTyping) {
      const l = live
      if (!l || !conversationId || conversationId === NEW_CONVERSATION) return
      let t = l.typingOut.get(conversationId)
      if (!t) {
        t = { want: false, value: false, sentAt: 0 }
        l.typingOut.set(conversationId, t)
      }
      clearTimeout(t.idle)
      t.want = isTyping
      if (isTyping) {
        t.idle = setTimeout(() => controller.setTyping(conversationId, false), TYPING_IDLE_MS)
      }
      pumpTyping(l, conversationId)
    },

    async saveContact(email) {
      const value = typeof email === 'string' ? email.trim() : ''
      if (!EMAIL_PATTERN.test(value) || value.length > 254) {
        throw new TicketpingError('invalid_email', 'Enter a valid email address.')
      }
      if (get().preview) {
        setIdentity({ ...get().identity, contactEmail: value })
        return
      }
      const l = requireLive()
      const res = await l.api.saveContact(value)
      if (live === l) setIdentity(normalizeIdentity(res.identity))
    },

    async uploadFile(file, uploadOptions = {}) {
      const state = get()
      const name = uploadOptions.name ?? (file as Partial<File>).name ?? 'file'
      if (!state.config.features.attachments) {
        throw new TicketpingError('feature_disabled', 'Attachments are switched off.', {
          details: { feature: 'attachments' }
        })
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new TicketpingError('file_too_large', `${name} is over 10 MB.`, {
          details: { maxBytes: MAX_UPLOAD_BYTES, name }
        })
      }
      if (!isAllowedFileType(file.type)) {
        throw new TicketpingError('file_type_not_allowed', `${name} isn't a supported file type.`, {
          details: { name }
        })
      }
      if (state.preview) {
        return {
          id: `preview:${env().uuid()}`,
          kind: 'file',
          name,
          size: file.size,
          contentType: file.type,
          isImage: /^image\/(png|jpeg|gif|webp)$/.test(file.type),
          url: ''
        }
      }
      const upload: UploadOptions = {}
      if (uploadOptions.onProgress) upload.onProgress = uploadOptions.onProgress
      if (uploadOptions.signal) upload.signal = uploadOptions.signal
      return requireLive().api.upload(file, name, upload)
    },

    trendingGifs(offset = 0, signal) {
      if (get().preview) return Promise.resolve({ results: [], nextOffset: null })
      if (!get().config.features.gifs) {
        return Promise.reject(new TicketpingError('feature_disabled', 'GIFs are switched off.'))
      }
      return requireLive().api.trendingGifs(offset, signal)
    },

    searchGifs(query, offset = 0, signal) {
      const q = (query ?? '').trim().slice(0, 50)
      if (!q) return controller.trendingGifs(offset, signal)
      if (get().preview) return Promise.resolve({ results: [], nextOffset: null })
      if (!get().config.features.gifs) {
        return Promise.reject(new TicketpingError('feature_disabled', 'GIFs are switched off.'))
      }
      return requireLive().api.searchGifs(q, offset, signal)
    }
  }

  return controller
}

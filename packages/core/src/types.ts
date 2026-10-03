export type ColorMode = 'light' | 'dark' | 'auto'
export type Position = 'bottom-right' | 'bottom-left'
export type ConsentState = 'granted' | 'pending' | 'denied'

export interface Appearance {
  accentColor: string
  colorMode: ColorMode
  position: Position
  launcher: { icon: 'chat' | 'help' | 'none'; label: string | null }
}

export type FeatureName = 'ai' | 'attachments' | 'emailCapture' | 'emoji' | 'gifs'

/** The part of the dashboard config (protocol 3.1) that code can override. */
export interface OverridableConfig {
  appearance: Appearance
  texts: Record<string, string>
  features: Record<FeatureName, boolean>
}

/** Code-side settings. Each one beats the dashboard (protocol 3.1.1). */
export interface ConfigOverrides {
  appearance?: Partial<Omit<Appearance, 'launcher'>> & {
    launcher?: Partial<Appearance['launcher']>
  }
  texts?: Record<string, string>
  /** Features can only be switched off from code; the dashboard decides what's allowed. */
  features?: Partial<Record<FeatureName, false>>
}

export interface InitOptions extends ConfigOverrides {
  publishableKey: string
  locale?: string
  hideLauncher?: boolean
  consent?: ConsentState
  /** Overrides the API origin. Only for local development against a self-run backend. */
  apiUrl?: string
  /** Sent in `X-Ticketping-Client`. Set by the framework adapters; leave it unset otherwise. */
  integration?: string
}

export type AttributeValue = string | number | boolean | null

export interface IdentifyOptions {
  userId?: string
  email?: string
  name?: string
  company?: { id: string; name?: string }
  attributes?: Record<string, AttributeValue>
  /** Returns a short-lived JWT signed by the host's server. Required for verified identity. */
  getToken?: () => Promise<string>
}

/** `update()`: SPA navigation, context attributes, and code overrides re-resolved against the dashboard. */
export interface UpdateOptions extends ConfigOverrides {
  page?: { url?: string; title?: string }
  attributes?: Record<string, AttributeValue>
  hideLauncher?: boolean
  locale?: string
}

export type IdentityState = 'anonymous' | 'unverified' | 'verified'

export interface TeamAvailability {
  state: 'online' | 'offline'
  /** Next opening, when `state` is `offline` and a schedule exists. */
  next: { day: string; time: string; timezone: string } | null
  /** Readable hours, when there is no single next opening to show. */
  hours: string | null
}

// ---------------------------------------------------------------------------
// Protocol objects (spec/protocol.md section 3)

export interface WidgetConfig extends OverridableConfig {
  id: string
  isTest: boolean
  team: {
    name: string
    avatars: string[]
    replyTimeHint: string | null
    /** `online` when working hours are off or the team is inside them. */
    availability: TeamAvailability
  }
  security: { requireVerifiedIdentity: boolean; identifiedOnly: boolean; loginUrl: string | null }
  branding: { poweredBy: boolean }
  socket: { url: string; heartbeatSeconds: number }
}

export interface Identity {
  state: IdentityState
  userId: string | null
  name: string | null
  email: string | null
  contactEmail: string | null
}

export type Phase = 'ai' | 'needs_contact' | 'team'
export type StatusTheme = 'RED' | 'GREEN' | 'BLUE' | 'YELLOW' | 'NEUTRAL'

export interface TicketStatus {
  slug: string
  label: string
  theme: StatusTheme
}

export interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  phase: Phase
  isTest: boolean
  unreadCount: number
  assignee: { name: string; avatarUrl: string | null } | null
  ticket: { id: string; status: TicketStatus } | null
  lastMessage: Message | null
}

export type SenderType = 'USER' | 'AGENT' | 'AI' | 'SYSTEM'

export interface Sender {
  type: SenderType
  name?: string | null
  avatarUrl?: string | null
}

export interface MessageBody {
  /** `text`, `markdown` or `html`. Render `fallbackText` for anything else. */
  format: string
  content: string
  fallbackText?: string
}

export type ConversationEvent =
  | { type: 'handoff' }
  | { type: 'contact_requested' }
  | { type: 'contact_saved' }
  | { type: 'ticket_created'; ticketId: string }
  | { type: 'status_changed'; status: TicketStatus }

export interface FileAttachment {
  id: string
  kind: 'file'
  name: string
  size: number
  contentType: string
  isImage: boolean
  url: string
  urlExpiresAt?: string
}

export interface GifMedia {
  provider: 'giphy'
  id: string
  title: string
  width: number
  height: number
  /** Empty on an optimistic (not yet acknowledged) message: fall back to `webpUrl`. */
  mp4Url: string
  webpUrl: string
  gifUrl: string
  stillUrl: string
}

export interface GifAttachment {
  id: string
  kind: 'gif'
  gif: GifMedia
}

/**
 * Unknown `kind` values can arrive from newer servers: render `name` (or "Attachment") as a link
 * when they carry a `url`, otherwise skip them (protocol 3.5).
 */
export type Attachment = FileAttachment | GifAttachment

export interface Message {
  id: string
  conversationId: string
  clientId?: string | null
  createdAt: string
  sender: Sender
  kind: 'message' | 'event'
  body: MessageBody | null
  attachments: Attachment[]
  event: ConversationEvent | null
}

export interface Session {
  accessToken: string
  accessExpiresAt: string
  refreshToken: string
  refreshExpiresAt: string
}

/** `tp:<publishableKey>:session` (protocol 2.5). */
export interface StoredSession extends Session {
  userId: string
}

/** `tp:<publishableKey>:visitor` (protocol 2.5). */
export interface StoredVisitor {
  token: string
  visitorId: string
}

export interface GifResult {
  provider: 'giphy'
  id: string
  title: string
  width: number
  height: number
  previewUrl: string
  stillUrl: string
}

export interface GifPage {
  results: GifResult[]
  nextOffset: number | null
}

// ---------------------------------------------------------------------------
// Widget events and errors

export interface WidgetError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface WidgetEvents {
  ready: undefined
  open: undefined
  close: undefined
  messageSent: { conversationId: string; messageId: string }
  messageReceived: { conversationId: string; messageId: string }
  conversationStarted: { conversationId: string }
  unreadCountChange: { count: number }
  identityChange: { state: IdentityState; userId: string | null }
  error: WidgetError
}

export type WidgetEventName = keyof WidgetEvents

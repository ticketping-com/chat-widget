import type {
  AttributeValue,
  ConsentState,
  IdentifyOptions,
  InitOptions,
  PreviewOptions,
  UpdateOptions,
  WidgetEventName,
  WidgetEvents
} from '@ticketping/core'

export type {
  AttributeValue,
  ColorMode,
  ConsentState,
  IdentifyOptions,
  IdentityState,
  InitOptions,
  PartialWidgetConfig,
  Position,
  PreviewOptions,
  PreviewView,
  UpdateOptions,
  WidgetError,
  WidgetEventName,
  WidgetEvents
} from '@ticketping/core'

export type EventHandler<K extends WidgetEventName> = (payload: WidgetEvents[K]) => void

export type Space = 'home' | 'messages'

export interface TicketpingApi {
  readonly version: string
  /** Starts the widget. Call once; later calls are ignored with a warning. */
  init(options: InitOptions): void
  /** `granted` boots; `pending` stops without touching storage; `denied` also deletes stored IDs. */
  consent(state: ConsentState): void
  /**
   * Signed (`userId` + `getToken`) or unsigned (`email`, `name`, `attributes`). Identifying a
   * different `userId` logs the previous user out first. Calls before `init()` apply after boot.
   */
  identify(options: IdentifyOptions): Promise<void>
  /** Page, attributes, locale, launcher and appearance overrides. No argument re-sends the current page. */
  update(options?: UpdateOptions): void
  /** Revokes the session, forgets the visitor and continues as a new anonymous visitor. */
  logout(): Promise<void>
  open(): void
  close(): void
  toggle(): void
  showLauncher(): void
  hideLauncher(): void
  /** Opens a new conversation with the composer prefilled. */
  showNewMessage(prefill?: string): void
  showConversation(conversationId: string): void
  showSpace(space: Space): void
  setLocale(locale: string): void
  /** Merged into the visitor's attributes and sent with the page context. */
  setContext(attributes: Record<string, AttributeValue>): void
  /** Recorded in memory only for now: the protocol has no event ingestion yet, so nothing is sent. */
  trackEvent(name: string, meta?: Record<string, AttributeValue>): void
  on<K extends WidgetEventName>(event: K, handler: EventHandler<K>): () => void
  off<K extends WidgetEventName>(event: K, handler: EventHandler<K>): void
  getUnreadCount(): number
  isOpen(): boolean
  /** Renders sample content with the given config: no network, no storage (dashboard live preview). */
  preview(options?: PreviewOptions): void
  /** Disconnects and removes the widget. `init()` can be called again afterwards. */
  destroy(): void
}

export type TicketpingMethod = {
  [K in keyof TicketpingApi]: TicketpingApi[K] extends (...args: never[]) => unknown ? K : never
}[keyof TicketpingApi]

/** The `window.Ticketping` global: callable as `Ticketping('open')`, or `Ticketping.open()` once loaded. */
export interface TicketpingGlobal extends TicketpingApi {
  <M extends TicketpingMethod>(method: M, ...args: Parameters<TicketpingApi[M]>): void
}

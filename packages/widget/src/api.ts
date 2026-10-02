import type { ConsentState, InitOptions, WidgetEventName, WidgetEvents } from '@ticketping/core'

export type {
  AttributeValue,
  ColorMode,
  ConsentState,
  IdentifyOptions,
  IdentityState,
  InitOptions,
  Position,
  WidgetError,
  WidgetEventName,
  WidgetEvents
} from '@ticketping/core'

export type EventHandler<K extends WidgetEventName> = (payload: WidgetEvents[K]) => void

export interface TicketpingApi {
  readonly version: string
  init(options: InitOptions): void
  consent(state: Exclude<ConsentState, 'pending'>): void
  open(): void
  close(): void
  toggle(): void
  showLauncher(): void
  hideLauncher(): void
  isOpen(): boolean
  getUnreadCount(): number
  on<K extends WidgetEventName>(event: K, handler: EventHandler<K>): () => void
  off<K extends WidgetEventName>(event: K, handler: EventHandler<K>): void
  destroy(): void
}

export type TicketpingMethod = {
  [K in keyof TicketpingApi]: TicketpingApi[K] extends (...args: never[]) => unknown ? K : never
}[keyof TicketpingApi]

/** The `window.Ticketping` global: callable as `Ticketping('open')`, or `Ticketping.open()` once loaded. */
export interface TicketpingGlobal extends TicketpingApi {
  <M extends TicketpingMethod>(method: M, ...args: Parameters<TicketpingApi[M]>): void
}

export type ColorMode = 'light' | 'dark' | 'auto'
export type Position = 'bottom-right' | 'bottom-left'
export type ConsentState = 'granted' | 'pending' | 'denied'

export interface InitOptions {
  publishableKey: string
  locale?: string
  colorMode?: ColorMode
  position?: Position
  hideLauncher?: boolean
  consent?: ConsentState
  /** Overrides the API origin. Only for local development against a self-run backend. */
  apiUrl?: string
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

export type IdentityState = 'anonymous' | 'unverified' | 'verified'

export interface WidgetState {
  open: boolean
  launcherVisible: boolean
  unreadCount: number
  position: Position
  colorMode: ColorMode
}

export interface WidgetError {
  code: string
  message: string
}

export interface WidgetEvents {
  ready: undefined
  open: undefined
  close: undefined
  messageSent: { conversationId: string; messageId: string }
  messageReceived: { conversationId: string; messageId: string }
  conversationStarted: { conversationId: string }
  unreadCountChange: { count: number }
  identityChange: { state: IdentityState }
  error: WidgetError
}

export type WidgetEventName = keyof WidgetEvents

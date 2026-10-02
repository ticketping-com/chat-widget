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

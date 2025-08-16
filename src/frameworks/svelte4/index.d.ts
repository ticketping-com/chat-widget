import { SvelteComponentTyped } from 'svelte'

export interface TicketpingChatTheme {
  primaryColor?: string
  primaryButtonBg?: string
  primaryButtonText?: string
  primaryHover?: string
  textPrimary?: string
  textSecondary?: string
  textMuted?: string
  textWhite?: string
  background?: string
  backgroundSecondary?: string
  backgroundTertiary?: string
  border?: string
  borderLight?: string
  borderCard?: string
  notificationBg?: string
  successColor?: string
  offlineColor?: string
  errorBg?: string
  errorText?: string
  errorBorder?: string
  pulseColor?: string
  shadowLight?: string
  shadowMedium?: string
  shadowDark?: string
  overlayLight?: string
}

export interface TicketpingChatUserData {
  userJWT: string
}

export interface TicketpingChatProps {
  appId?: string
  teamSlug?: string
  teamLogoIcon?: string
  apiBase?: string
  wsBase?: string
  userJWT?: string
  debug?: boolean
  showPulseAnimation?: boolean
  analytics?: boolean
  theme?: TicketpingChatTheme | null
  open?: boolean
}

export default class TicketpingChat extends SvelteComponentTyped<
  TicketpingChatProps
> {
  openWidget(): void
  closeWidget(): void
  toggleWidget(): void
  startConversation(): Promise<string> | undefined
  identifyUser(userData: TicketpingChatUserData): void
  isReady(): boolean
}

import { SvelteComponent } from 'svelte'

export interface TicketpingChatTheme {
  primaryColor?: string
  primaryButtonText?: string
  primaryHover?: string
  textPrimary?: string
  textSecondary?: string
  textMuted?: string
  background?: string
  backgroundSecondary?: string
  backgroundTertiary?: string
  border?: string
  borderLight?: string
  notificationBg?: string
  successColor?: string
  offlineColor?: string
  errorBg?: string
  errorText?: string
  errorBorder?: string
  shadowLight?: string
  shadowMedium?: string
  shadowDark?: string
  iconColor?: string
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
  analytics?: boolean
  theme?: TicketpingChatTheme | null
  open?: boolean
}

export default class TicketpingChat extends SvelteComponent<TicketpingChatProps> {
  openWidget(): void
  closeWidget(): void
  toggleWidget(): void
  startConversation(): Promise<string> | undefined
  identifyUser(userData: TicketpingChatUserData): void
  isReady(): boolean
}

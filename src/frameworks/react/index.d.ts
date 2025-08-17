import React from 'react';

export interface TicketpingChatTheme {
  primaryColor?: string;
  primaryButtonBg?: string;
  primaryButtonText?: string;
  primaryHover?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  textWhite?: string;
  background?: string;
  backgroundSecondary?: string;
  backgroundTertiary?: string;
  border?: string;
  borderLight?: string;
  borderCard?: string;
  notificationBg?: string;
  successColor?: string;
  offlineColor?: string;
  errorBg?: string;
  errorText?: string;
  errorBorder?: string;
  pulseColor?: string;
  shadowLight?: string;
  shadowMedium?: string;
  shadowDark?: string;
  overlayLight?: string;
}

export interface TicketpingChatUserData {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  [key: string]: any;
}

export interface TicketpingChatProps {
  appId?: string;
  teamSlug?: string;
  teamLogoIcon?: string;
  apiBase?: string;
  wsBase?: string;
  userJWT?: string;
  debug?: boolean;
  showPulseAnimation?: boolean;
  analytics?: boolean;
  theme?: TicketpingChatTheme | null;
  open?: boolean;
}

export interface TicketpingChatRef {
  openWidget(): void;
  closeWidget(): void;
  toggleWidget(): void;
  startConversation(): Promise<string> | undefined;
  identifyUser(userData: TicketpingChatUserData): void;
  isReady(): boolean;
}

declare const TicketpingChat: React.ForwardRefExoticComponent<
  TicketpingChatProps & React.RefAttributes<TicketpingChatRef>
>;

export default TicketpingChat;

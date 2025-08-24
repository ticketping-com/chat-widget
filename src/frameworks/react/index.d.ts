import React from 'react';

export interface TicketpingChatTheme {
  primaryColor?: string;
  primaryButtonText?: string;
  primaryHover?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  background?: string;
  backgroundSecondary?: string;
  backgroundTertiary?: string;
  border?: string;
  borderLight?: string;
  notificationBg?: string;
  successColor?: string;
  offlineColor?: string;
  errorBg?: string;
  errorText?: string;
  errorBorder?: string;
  shadowLight?: string;
  shadowMedium?: string;
  shadowDark?: string;
}

export interface TicketpingChatUserData {
  userJWT: string;
}

export interface TicketpingChatMessage {
  sessionId: string;
  type: 'user_message' | 'agent_message' | 'system_message';
  sender: 'USER' | 'AGENT' | 'SYSTEM';
  messageText: string;
  created: string;
  file?: {
    name: string;
    size: number;
    type: string;
    url: string;
  };
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
  analytics?: boolean;
  theme?: TicketpingChatTheme;
  onReady?: () => void;
  onError?: (error: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: TicketpingChatMessage) => void;
  onMessageReceived?: (message: TicketpingChatMessage) => void;
  onConversationStarted?: (id: string) => void;
}

declare const TicketpingChat: React.FC<TicketpingChatProps>;

export default TicketpingChat;

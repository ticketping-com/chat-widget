// TypeScript declarations for @ticketping/chat-widget

export interface TicketpingConfig {
  // Required
  appId: string;
  teamSlug: string;
  teamLogoIcon?: string;

  // API Configuration
  apiBase?: string;
  wsBase?: string;

  // Authentication
  userJWT?: string;
  enableSecureMode?: boolean;

  // Widget Appearance
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'default' | 'dark' | 'light' | CustomTheme;
  primaryColor?: string;
  borderRadius?: string;
  zIndex?: number;

  // Widget Behavior
  autoOpen?: boolean;
  showPulseAnimation?: boolean;
  enableTypingIndicators?: boolean;
  enableFileUpload?: boolean;
  enableEmojis?: boolean;

  // File Upload
  maxFileSize?: number;
  allowedFileTypes?: string[];

  // Messages
  maxMessageLength?: number;
  enableMarkdown?: boolean;
  enableLinkPreviews?: boolean;

  // Conversations
  showConversationHistory?: boolean;
  maxConversationsStored?: number;
  autoDeleteAfterDays?: number;

  // Notifications
  enableSoundNotifications?: boolean;
  enableBrowserNotifications?: boolean;

  // Analytics
  analytics?: boolean;
  trackUserInteractions?: boolean;

  // Localization
  locale?: string;
  timezone?: string;

  // Development
  debug?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  // Custom Labels
  labels?: WidgetLabels;

  // Custom CSS
  customCSS?: string;

  // Callbacks
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  onConversationStarted?: (id: string) => void;
  onError?: (error: any) => void;
}

export interface CustomTheme {
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

export interface WidgetLabels {
  headerTitle?: string;
  headerSubtitle?: string;
  homeTab?: string;
  messagesTab?: string;
  welcomeTitle?: string;
  welcomeMessage?: string;
  startConversationButton?: string;
  messageInputPlaceholder?: string;
  sendButton?: string;
  attachButton?: string;
  typingIndicator?: string;
  agentOnline?: string;
  agentOffline?: string;
  connectionLost?: string;
  fileTooLarge?: string;
  fileTypeNotAllowed?: string;
  messageTooLong?: string;
  sendError?: string;
  loadError?: string;
  noConversations?: string;
  noConversationsDescription?: string;
  helpArticlesTitle?: string;
  helpArticles?: HelpArticle[];
}

export interface HelpArticle {
  title: string;
  url: string;
  icon: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  company?: string;
  userJWT?: string;
  [key: string]: any;
}

export interface ChatMessage {
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

export interface TicketpingChatInstance {
  open(): void;
  close(): void;
  toggle(): void;
  identify(userData: UserData): Promise<void>;
  sendMessage(messageData: any): Promise<void>;
  startConversation(): Promise<void>;
  destroy(): void;
  config: TicketpingConfig;
  isInitialized: boolean;
  isOpen: boolean;
  currentUser: UserData | null;
}

declare global {
  interface Window {
    TicketpingChat: {
      instance: TicketpingChatInstance | null;
      init: (config: TicketpingConfig) => TicketpingChatInstance;
      identify: (userData: UserData) => void;
      open: () => void;
      close: () => void;
      startConversation: () => void;
      destroy: () => void;
      version: string;
    };
    ticketpingConfig?: TicketpingConfig;
  }
}

// Module declaration for style import
declare module '@ticketping/chat-widget/style';

declare const TicketpingChat: TicketpingChatInstance;
export default TicketpingChat;

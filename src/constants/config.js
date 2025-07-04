// src/constants/config.js
export const DEFAULT_CONFIG = {
  // Required
  appId: null,

  // API Configuration
  apiBase: 'https://api.ticketping.com',
  wsUrl: 'wss://ws.ticketping.com',

  // Authentication
  userJWT: null,
  enableSecureMode: true,

  // Widget Appearance
  position: 'bottom-right', // 'bottom-right' | 'bottom-left'
  theme: 'default', // 'default' | 'dark' | 'light'
  primaryColor: '#667eea',
  borderRadius: '12px',
  zIndex: 999999,

  // Widget Behavior
  autoOpen: false,
  showPulseAnimation: true,
  enableTypingIndicators: true,
  enableFileUpload: true,
  enableEmojis: true,

  // File Upload
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],

  // Messages
  maxMessageLength: 5000,
  enableMarkdown: false,
  enableLinkPreviews: true,

  // Conversations
  showConversationHistory: true,
  maxConversationsStored: 50,
  autoDeleteAfterDays: 30,

  // Notifications
  enableSoundNotifications: true,
  enableBrowserNotifications: false,

  // Analytics
  analytics: true,
  trackUserInteractions: true,

  // Localization
  locale: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

  // Development
  debug: __DEV__,
  logLevel: __DEV__ ? 'debug' : 'error',

  // Custom Labels
  labels: {
    // Header
    headerTitle: 'Ticketping',
    headerSubtitle: 'We\'re here to help!',

    // Tabs
    homeTab: 'Home',
    messagesTab: 'Messages',

    // Home Tab
    welcomeTitle: '👋 Welcome!',
    welcomeMessage: 'Hi there! How can we help you today?',
    startConversationButton: 'Send us a message',

    // Messages
    messageInputPlaceholder: 'Type your message...',
    sendButton: 'Send',
    attachButton: 'Attach file',

    // Status Messages
    typingIndicator: 'Support is typing...',
    agentOnline: 'We\'re online and ready to help!',
    agentOffline: 'We\'ll get back to you soon!',
    connectionLost: 'Connection lost. Trying to reconnect...',

    // Errors
    fileTooLarge: 'File size exceeds maximum limit',
    fileTypeNotAllowed: 'File type not supported',
    messageTooLong: 'Message is too long',
    sendError: 'Failed to send message. Please try again.',
    loadError: 'Failed to load conversation',

    // Empty States
    noConversations: 'No conversations yet',
    noConversationsDescription: 'Start a conversation to get help from our support team.',

    // Help Articles
    helpArticlesTitle: 'Popular articles',
    helpArticles: [
      {
        title: 'Getting started guide',
        url: '/help/getting-started',
        icon: 'article'
      },
      {
        title: 'How to create tickets',
        url: '/help/create-tickets',
        icon: 'check'
      },
      {
        title: 'Best practices',
        url: '/help/best-practices',
        icon: 'star'
      }
    ]
  },

  // Custom CSS
  customCSS: null,

  // Callbacks
  onReady: null,
  onOpen: null,
  onClose: null,
  onMessageSent: null,
  onMessageReceived: null,
  onConversationStarted: null,
  onError: null
};

export const API_ENDPOINTS = {
  auth: '/auth/chat-token',
  conversations: '/conversations',
  messages: '/messages',
  upload: '/upload',
  analytics: '/analytics'
};

export const WEBSOCKET_EVENTS = {
  // Client -> Server
  AUTH: 'auth',
  MESSAGE: 'message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',

  // Server -> Client
  MESSAGE_RECEIVED: 'message_received',
  TYPING_INDICATOR: 'typing_indicator',
  AGENT_STATUS: 'agent_status',
  AGENT_JOINED: 'agent_joined',
  AGENT_LEFT: 'agent_left',
  CONVERSATION_UPDATED: 'conversation_updated',
  ERROR: 'error'
};

export const STORAGE_KEYS = {
  CONVERSATIONS: 'ticketping_conversations',
  USER_DATA: 'ticketping_user',
  SETTINGS: 'ticketping_settings',
  DEVICE_ID: 'ticketping_device_id'
};

export const CSS_CLASSES = {
  WIDGET: 'ticketping-widget',
  BUBBLE: 'chat-bubble',
  WINDOW: 'chat-window',
  OPEN: 'open',
  CLOSED: 'closed',
  PULSE: 'pulse',
  TYPING: 'typing',
  MESSAGE: 'message',
  USER_MESSAGE: 'message--user',
  AGENT_MESSAGE: 'message--agent',
  SYSTEM_MESSAGE: 'message--system'
};

export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 1024
};

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  PULSE: 2000
};

export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 3,
  ALLOWED_TYPES: [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
};
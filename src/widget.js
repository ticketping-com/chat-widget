// src/widget.js - Main entry point
import './styles/main.css';
import { ChatBubble } from './components/chat-bubble.js';
import { ChatWindow } from './components/chat-window.js';
import { WebSocketService } from './services/websocket.js';
import { NotificationWS } from './services/notification-websocket.js';
import { ApiService } from './services/api.js';
import { StorageService } from './services/storage.js';
import { DEFAULT_CONFIG } from './constants/config.js';
import { validateConfig } from './utils/validation.js';
import { createDOMElement } from './utils/dom.js';

class TicketpingChat {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isInitialized = false;
    this.isOpen = false;
    this.currentUser = null;

    // Services
    this.api = new ApiService(this.config);
    this.storage = new StorageService();
    this.ws = null; // Conversation WebSocket (per-conversation)
    this.notifiWs = null; // Notification WebSocket (persistent)

    // Components
    this.chatBubble = null;
    this.chatWindow = null;
    this.widgetContainer = null;

    // State
    this.conversations = new Map();
    this.isChatSessionActive = false;
    this.currentChatSession = null;
    this.unreadCount = 0; // Track total unread messages when widget is closed
    this.unreadConversations = new Set(); // Track which conversations have unread messages

    // Team settings (fetched from server)
    this.teamSettings = null;

    this.init();
  }

  async init() {
    if (this.isInitialized) {
      console.warn('TicketpingChat already initialized');
      return;
    }

    try {
      // Validate configuration
      const validation = validateConfig(this.config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Fetch team settings from server
      await this.fetchTeamSettings();

      // Create widget container
      this.createWidgetContainer();

      // Apply widget position from team settings
      this.applyWidgetPosition();

      // Initialize components
      this.chatBubble = new ChatBubble(this.widgetContainer, {
        onClick: () => this.toggle(),
        iconColor: this.getIconColor(),
      });

      // Check if bubble should be visible
      if (!this.shouldShowBubble()) {
        // Hide the bubble but keep components initialized for programmatic access
        this.chatBubble.hide();
        this.track('widget_bubble_hidden_by_settings');
      }

      this.chatWindow = new ChatWindow(this.widgetContainer, {
        onClose: () => this.close(),
        onTabSwitch: (tab) => this.handleTabSwitch(tab),
        onSendMessage: (message) => this.sendMessage(message),
        onFileUpload: (file) => this.handleFileUpload(file),
        onConversationSelect: (sessionId) => this.loadConversation(sessionId),
        onBackButtonClick: () => this.backToList(),
        teamLogoIcon: this.getTeamLogoIcon(),
        teamSettings: this.teamSettings,
      });

      // Load stored conversations
      await this.loadStoredConversations();

      // Initialize notification WebSocket for real-time unread updates
      this.initNotificationWebSocket();

      this.isInitialized = true;

      // Track initialization
      this.track('widget_initialized', {
        appId: this.config.appId,
        version: __VERSION__
      });

    } catch (error) {
      console.error('Failed to initialize TicketpingChat:', error);
      this.track('widget_init_error', { error: error.message });
    }
  }

  /**
   * Fetch team widget settings from server
   */
  async fetchTeamSettings() {
    try {
      this.teamSettings = await this.api.getTeamWidgetSettings();
      this.track('team_settings_loaded', {
        teamSlug: this.teamSettings?.teamSlug,
        isAvailable: this.teamSettings?.isAvailable
      });
    } catch (error) {
      console.warn('Failed to fetch team settings, using defaults:', error);
      this.teamSettings = null;
    }
  }

  /**
   * Get team logo icon from team settings or config
   */
  getTeamLogoIcon() {
    // Prefer team settings logo, fallback to config
    return this.config.teamLogoIcon || this.teamSettings?.logoUrl || null;
  }

  /**
   * Check if widget bubble should be shown based on team settings
   */
  shouldShowBubble() {
    // Default to true if no team settings or widgetBubbleVisible not set
    if (!this.teamSettings || this.teamSettings.widgetBubbleVisible === undefined) {
      return true;
    }
    return this.teamSettings.widgetBubbleVisible;
  }

  /**
   * Apply widget position from team settings
   */
  applyWidgetPosition() {
    if (!this.widgetContainer) {
      return;
    }

    // Get position from team settings (default to 'right')
    const position = this.teamSettings?.widgetPosition || this.config.position || 'bottom-right';

    // Normalize position value
    const normalizedPosition = position === 'left' ? 'bottom-left' : 'bottom-right';

    // Remove existing position classes
    this.widgetContainer.classList.remove('position-bottom-left', 'position-bottom-right');

    // Apply position class
    if (normalizedPosition === 'bottom-left') {
      this.widgetContainer.classList.add('position-bottom-left');
    }
  }

  backToList() {
    this.isChatSessionActive = false;
    this.currentChatSession = null;
    if (this.ws) {
      this.ws.disconnect();
    }
    // Update the conversation list with the latest conversations
    this.chatWindow.setConversations(
      Array.from(this.conversations.values()),
      this.unreadConversations
    );
    this.track('back_to_list');
  }

  async startConversation() {
    const result = await this.api.createChatSession();
    this.currentChatSession = result.sessionId;
    await this.initWsConversation(result.sessionId);
    this.isChatSessionActive = true;
  }

  async initWsConversation(sessionId) {
    try {
      if (this.config.userJWT) {
        await this.initAuthWsConversation(sessionId);
      } else {
        await this.initAnonWsConversation(sessionId);
      }
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
      this.track('websocket_init_error', { error: error.message });
      throw error; // Re-throw to handle in calling function
    }
  }

  async initAnonWsConversation(sessionId) {
    return new Promise((resolve, reject) => {
      try {
        let wsUrl = `${this.config.wsBase}/ws/chat/${this.config.teamSlug}/`;
        if (sessionId) {
          wsUrl = `${this.config.wsBase}/ws/chat/${this.config.teamSlug}/${sessionId}/`;
        }
        this.ws = new WebSocketService(wsUrl, null, {
          onSessionState: (data) => {
            this.handleSessionState(data);
            resolve(); // Resolve when we get session state
          },
          onMessage: (message) => this.handleWebSocketMessage(message),
          onFileAttachment: (data) => this.handleWebSocketMessage(data),
          onMessageHistory: (data) => this.handleMessageHistory(data),
          onTyping: (data) => this.handleTypingIndicator(data),
          onStatusChange: (status) => this.handleAgentStatus(status),
          onError: (error) => {
            this.handleWebSocketError(error);
            reject(error);
          }
        });

        // Set a timeout in case the connection takes too long
        setTimeout(() => {
          if (this.ws && !this.ws.isWsConnected()) {
            resolve(); // Resolve anyway after timeout to not block UI
          }
        }, 5000);
      } catch (error) {
        console.warn('WebSocket initialization failed:', error);
        this.track('websocket_init_error', { error: error.message });
        reject(error);
      }
    });
  }

  async initAuthWsConversation(sessionId) {
    return new Promise(async (resolve, reject) => {
      try {
        const { chatJWT } = await this.api.getChatToken();
        let wsUrl = `${this.config.wsBase}/ws/chat/${this.config.teamSlug}/?jwt=${chatJWT}`;
        if (sessionId) {
          wsUrl = `${this.config.wsBase}/ws/chat/${this.config.teamSlug}/${sessionId}/?jwt=${chatJWT}`;
        }
        this.ws = new WebSocketService(wsUrl, chatJWT, {
          onSessionState: (data) => {
            this.handleSessionState(data);
            resolve(); // Resolve when we get session state
          },
          onMessage: (message) => this.handleWebSocketMessage(message),
          onFileAttachment: (data) => this.handleWebSocketMessage(data),
          onMessageHistory: (data) => this.handleMessageHistory(data),
          onTyping: (data) => this.handleTypingIndicator(data),
          onStatusChange: (status) => this.handleAgentStatus(status),
          onError: (error) => {
            this.handleWebSocketError(error);
            reject(error);
          }
        });

        // Set a timeout in case the connection takes too long
        setTimeout(() => {
          if (this.ws && !this.ws.isWsConnected()) {
            resolve(); // Resolve anyway after timeout to not block UI
          }
        }, 5000);
      } catch (error) {
        console.warn('WebSocket auth initialization failed:', error);
        this.track('websocket_auth_init_error', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Initialize persistent notification WebSocket for real-time unread count updates
   */
  initNotificationWebSocket() {
    // Disconnect existing notification WebSocket if any
    if (this.notifiWs) {
      this.notifiWs.disconnect();
    }

    const wsUrl = `${this.config.wsBase}/ws/customer-notifs/${this.config.teamSlug}/`;

    this.notifiWs = new NotificationWS(wsUrl, {
      onUnreadCount: (count) => this.handleUnreadCountUpdate(count),
      onConnect: () => {
        console.log('Notification WebSocket connected');
        this.track('notification_ws_connected');
      },
      onDisconnect: () => {
        console.log('Notification WebSocket disconnected');
      },
      onError: (error) => {
        console.warn('Notification WebSocket error:', error);
      }
    });
  }

  /**
   * Handle unread count updates from notification WebSocket
   */
  handleUnreadCountUpdate(count) {
    this.unreadCount = count;

    // Update bubble notification (only when widget is closed)
    if (count > 0 && !this.isOpen) {
      this.chatBubble.showNotificationBadge(count);
    } else {
      this.chatBubble.hideNotificationBadge();
    }

    // Update Messages tab unread dot
    this.chatWindow.setMessagesTabUnread(count > 0);

    // Refresh conversations list to get updated hasUnread flags
    this.refreshConversations();

    this.track('unread_count_updated', { count });
  }

  /**
   * Refresh conversations from server to get updated unread state
   */
  async refreshConversations() {
    try {
      if (this.config.userJWT) {
        const serverConversations = await this.api.getConversations();
        if (serverConversations && serverConversations.results) {
          this.unreadConversations.clear();
          serverConversations.results.forEach(conv => {
            // Preserve existing messages array if conversation already exists
            const existing = this.conversations.get(conv.sessionId);
            const messages = existing?.messages || conv.messages || [];
            this.conversations.set(conv.sessionId, { ...conv, messages });
            if (conv.hasUnread) {
              this.unreadConversations.add(conv.sessionId);
            }
          });

          this.chatWindow.setConversations(
            Array.from(this.conversations.values()),
            this.unreadConversations
          );
        }
      }
    } catch (error) {
      console.warn('Failed to refresh conversations:', error);
    }
  }

  createWidgetContainer() {
    // Remove existing widget if any
    const existing = document.querySelector('.ticketping-widget');
    if (existing) {
      existing.remove();
    }

    this.widgetContainer = createDOMElement('div', {
      className: 'ticketping-widget',
      'data-version': __VERSION__
    });

    // Apply custom theme if provided
    this.applyCustomTheme();

    document.body.appendChild(this.widgetContainer);
  }

  applyCustomTheme() {
    if (!this.config.theme) {
      return;
    }

    const theme = this.config.theme;
    const root = document.documentElement;

    // Apply theme colors as CSS custom properties
    const themeMap = {
      primaryColor: '--tp-primary-color',
      primaryButtonText: '--tp-primary-button-text',
      primaryHover: '--tp-primary-hover',
      textPrimary: '--tp-text-primary',
      textSecondary: '--tp-text-secondary',
      textMuted: '--tp-text-muted',
      background: '--tp-background',
      backgroundSecondary: '--tp-background-secondary',
      backgroundTertiary: '--tp-background-tertiary',
      border: '--tp-border',
      borderLight: '--tp-border-light',
      notificationBg: '--tp-notification-bg',
      successColor: '--tp-success-color',
      offlineColor: '--tp-offline-color',
      errorBg: '--tp-error-bg',
      errorText: '--tp-error-text',
      errorBorder: '--tp-error-border',
      shadowLight: '--tp-shadow-light',
      shadowMedium: '--tp-shadow-medium',
      shadowDark: '--tp-shadow-dark',
      iconColor: '--tp-icon-color',
    };

    Object.entries(themeMap).forEach(([themeKey, cssVar]) => {
      if (theme[themeKey]) {
        root.style.setProperty(cssVar, theme[themeKey]);
      }
    });
  }

  getIconColor() {
    // Return icon color from theme, fallback to primary color, then default
    if (this.config.theme && typeof this.config.theme === 'object') {
      return this.config.theme.iconColor;
    }
    return null; // Will use default color in ChatBubble
  }


  // Public API methods
  open() {
    if (!this.isInitialized) {
      return;
    }
    this.isOpen = true;
    this.chatBubble.setOpen(true);
    this.chatWindow.show();

    // Clear unread notification when opening
    this.clearUnreadNotification();

    this.track('widget_opened');
  }

  clearUnreadNotification() {
    this.unreadCount = 0;
    this.chatBubble.hideNotificationBadge();
  }

  markConversationAsRead(sessionId) {
    if (this.unreadConversations.has(sessionId)) {
      // Update local state immediately for responsive UI
      this.unreadConversations.delete(sessionId);

      // Update conversation list UI
      this.chatWindow.setConversations(
        Array.from(this.conversations.values()),
        this.unreadConversations
      );

      // Send mark_read to server via WebSocket
      if (this.ws && this.ws.isWsConnected()) {
        this.ws.markRead(sessionId);
      }
    }
  }

  close() {
    if (!this.isInitialized) {
      return;
    }
    if (this.ws) {
      this.ws.disconnect();
    }
    this.isOpen = false;
    this.chatBubble.setOpen(false);
    this.chatWindow.hide();
    this.track('widget_closed');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  async identify(userData) {
    this.currentUser = userData;
    this.storage.setUser(userData);

    if (userData.userJWT && userData.userJWT !== 'your-actual-jwt-token-here') {
      this.config.userJWT = userData.userJWT;

      try {
        // Load authenticated user conversations
        await this.loadAuthenticatedUserData();

        // Reinitialize WebSocket connection with authentication if currently active
        await this.reinitializeWebSocketIfNeeded();
        this.track('user_identified', {
          userId: userData.id || userData.email || 'unknown',
          hasJWT: !!userData.userJWT
        });
      } catch (error) {
        console.warn('Failed to initialize authenticated user features:', error);
        this.track('user_identify_error', { error: error.message });
      }
    }
  }

  async sendMessage(messageData) {
    console.log('sendMessage', messageData);
    if (!this.currentChatSession) {
      throw new Error('No conversation started!');
    }

    const message = {
      sessionId: this.currentChatSession,
      type: 'user_message',
      sender: 'USER',
      messageText: messageData.text,
      created: new Date().toISOString(),
      ...messageData
    };

    console.log('message', message);

    // Add to local state
    this.addMessageToConversation(this.currentChatSession, message);

    // Update UI
    this.chatWindow.addMessage(message);

    // Send via WebSocket or API
    if (this.ws && this.ws.isWsConnected()) {
      this.ws.sendMessage(message);
    } else {
      await this.api.sendMessage(message);
    }

    this.track('message_sent', {
      chatSessionId: this.currentChatSession,
      messageType: message.type,
      hasAttachment: !!message.file
    });
  }

  async handleFileUpload(file) {
    try {
      if (file.size > this.config.maxFileSize) {
        throw new Error(`File size exceeds ${this.config.maxFileSize / 1024 / 1024}MB limit`);
      }

      await this.api.uploadFile(file, this.currentChatSession);

      // Send as message
      // await this.sendMessage({
      //   text: `📎 ${file.name}`,
      //   file: {
      //     name: file.name,
      //     size: file.size,
      //     type: file.type,
      //     url: fileUrl
      //   }
      // });

    } catch (error) {
      console.error('File upload failed:', error);
      this.chatWindow.showError('Failed to upload file: ' + error.message);
      this.track('file_upload_error', { error: error.message });
    }
  }

  handleSessionState(data) {
    console.log('handleSessionState', data);
    this.currentChatSession = data.sessionId;
    this.conversations.set(data.sessionId, {
      sessionId: data.sessionId,
      messages: [],
      created: data.created,
    });
    this.chatWindow.showConversationItem(this.currentChatSession);
  }

  handleWebSocketMessage(data) {
    this.addMessageToConversation(data.sessionId, data);
    if (data.sessionId === this.currentChatSession) {
      this.chatWindow.addMessage(data);
    }

    // Track unread conversations for the conversation list UI (immediate feedback)
    // Only track messages from agent/system, not user's own messages
    // Note: The bubble notification is handled by the notification WebSocket
    if (data.sender !== 'USER') {
      const isViewingThisConversation = this.isOpen && data.sessionId === this.currentChatSession;

      if (!isViewingThisConversation) {
        // Mark this conversation as having unread messages (client-side for immediate UI)
        this.unreadConversations.add(data.sessionId);

        // Update conversation list UI to show unread indicator
        this.chatWindow.setConversations(
          Array.from(this.conversations.values()),
          this.unreadConversations
        );
      }
    }
  }

  handleMessageHistory(data) {
    console.log('handleMessageHistory', data);
    console.log('this.conversations', this.conversations);
    this.conversations.set(data.sessionId, {
      sessionId: data.sessionId,
      messages: data.messages,
      created: data.created,
    });
    this.chatWindow.setMessages(data.messages);
  }

  handleTabSwitch(tab) {
    this.track('tab_switched', { tab });
  }

  async loadConversation(chatSessionId) {
    try {
      // Handle new conversation case
      if (!chatSessionId || chatSessionId === 'new') {
        // Show loading state immediately
        this.chatWindow.switchTab('messages');
        this.chatWindow.showLoadingState();

        await this.startConversation();

        // Hide loading state and show conversation
        this.chatWindow.showConversationItem();
        return;
      }

      // Show loading for existing conversation
      this.chatWindow.switchTab('messages');
      this.chatWindow.showLoadingState();

      await this.initWsConversation(chatSessionId);
      this.isChatSessionActive = true;

      // Mark conversation as read when opened
      this.markConversationAsRead(chatSessionId);

      // Hide loading state when conversation is loaded
      this.chatWindow.showConversationItem();

      this.track('conversation_loaded', { chatSessionId });
    } catch (error) {
      console.error('Failed to load conversation:', error);
      this.chatWindow.hideLoadingState();
      this.chatWindow.showError('Failed to load conversation');
    }
  }

  async loadStoredConversations() {
    try {
      const stored = this.storage.getConversations();
      stored.forEach(conv => this.conversations.set(conv.sessionId, conv));

      // Sync with server if authenticated
      if (this.config.userJWT) {
        const serverConversations = await this.api.getConversations();
        serverConversations['results'].forEach(conv => {
          this.conversations.set(conv.sessionId, conv);
          this.storage.saveConversation(conv);
          // Use server's hasUnread flag as source of truth
          if (conv.hasUnread) {
            this.unreadConversations.add(conv.sessionId);
          }
        });
      }

      this.chatWindow.setConversations(
        Array.from(this.conversations.values()),
        this.unreadConversations
      );
    } catch (error) {
      console.warn('Failed to load conversations:', error);
    }
  }

  /**
   * Load authenticated user data including conversations and user preferences
   */
  async loadAuthenticatedUserData() {
    if (!this.config.userJWT) {
      return;
    }

    try {
      // Load user conversations from server
      const serverConversations = await this.api.getConversations();

      if (serverConversations && serverConversations.results) {
        // Clear existing conversations and unread state, load fresh from server
        this.conversations.clear();
        this.unreadConversations.clear();

        // Load server conversations
        serverConversations.results.forEach(conv => {
          this.conversations.set(conv.sessionId, conv);
          this.storage.saveConversation(conv);
          // Use server's hasUnread flag as source of truth
          if (conv.hasUnread) {
            this.unreadConversations.add(conv.sessionId);
          }
        });

        // Update UI with new conversations
        if (this.chatWindow) {
          this.chatWindow.setConversations(
            Array.from(this.conversations.values()),
            this.unreadConversations
          );
        }

        console.log(`Loaded ${serverConversations.results.length} conversations for authenticated user`);
      }

    } catch (error) {
      console.warn('Failed to load authenticated user data:', error);
      // Fallback to local storage data
      await this.loadStoredConversations();
      throw error;
    }
  }

  /**
   * Reinitialize WebSocket connection with authentication if needed
   */
  async reinitializeWebSocketIfNeeded() {
    // Only reinitialize if we have an active chat session
    if (!this.isChatSessionActive || !this.currentChatSession) {
      return;
    }

    try {
      console.log('Reinitializing WebSocket with authentication...');

      // Disconnect current WebSocket
      if (this.ws) {
        this.ws.disconnect();
        this.ws = null;
      }

      // Reinitialize with authentication
      await this.initWsConversation(this.currentChatSession);

      console.log('WebSocket reinitialized with authentication successfully');

      this.track('websocket_reinitialized', {
        sessionId: this.currentChatSession,
        authenticated: true
      });

    } catch (error) {
      console.error('Failed to reinitialize WebSocket:', error);
      this.track('websocket_reinit_error', {
        error: error.message,
        sessionId: this.currentChatSession
      });

      // Don't throw - allow the widget to continue working
      // The user can still use the chat, just without real-time features
    }
  }

  // Utility methods
  addMessageToConversation(chatSessionId, message) {
    const conversation = this.conversations.get(chatSessionId);
    console.log('addMessageToConversation', conversation, chatSessionId, message);
    if (conversation) {
      conversation.messages.push(message);
      conversation.modified = new Date();
      this.storage.saveConversation(conversation);
    }
  }

  track(event, data = {}) {
    if (__DEV__) {
      console.log('Track:', event, data);
    }

    // Send to analytics in production
    if (this.config.analytics && !__DEV__) {
      this.api.track(event, {
        ...data,
        timestamp: new Date().toISOString(),
        appId: this.config.appId,
        version: __VERSION__
      });
    }
  }

  handleWebSocketError(error) {
    console.warn('WebSocket error:', error);
    this.track('websocket_error', { error: error.message });
  }

  handleAgentStatus(status) {
    this.chatWindow.updateAgentStatus(status);
  }

  handleAgentJoined(data) {
    this.chatWindow.showAgentJoined(data.agent);
  }

  handleTypingIndicator(data) {
    if (data.sessionId === this.currentChatSession) {
      this.chatWindow.showTypingIndicator(data.typing);
    }
  }

  // Cleanup
  destroy() {
    // Disconnect conversation WebSocket
    if (this.ws) {
      this.ws.disconnect();
    }

    // Disconnect notification WebSocket
    if (this.notifiWs) {
      this.notifiWs.disconnect();
    }

    if (this.widgetContainer) {
      this.widgetContainer.remove();
    }

    this.isInitialized = false;
    this.isChatSessionActive = false;
    this.currentChatSession = null;
    this.currentUser = null;

    this.track('widget_destroyed');
  }
}

// Global API
window.TicketpingChat = {
  instance: null,

  init(config = {}) {
    if (this.instance) {
      console.warn('TicketpingChat already initialized');
      return this.instance;
    }

    this.instance = new TicketpingChat(config);
    return this.instance;
  },

  identify(userData) {
    if (this.instance) {
      return this.instance.identify(userData);
    }
  },

  open() {
    if (this.instance) {
      this.instance.open();
    }
  },

  close() {
    if (this.instance) {
      this.instance.close();
    }
  },

  startConversation() {
    if (this.instance) {
      return this.instance.startConversation();
    }
  },

  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  },

  // Version info
  version: __VERSION__
};

// Auto-initialize if config is provided
if (window.ticketpingConfig) {
  window.TicketpingChat.init(window.ticketpingConfig);
}

export default TicketpingChat;

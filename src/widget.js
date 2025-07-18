// src/widget.js - Main entry point
import './styles/main.css';
import { ChatBubble } from './components/chat-bubble.js';
import { ChatWindow } from './components/chat-window.js';
import { WebSocketService } from './services/websocket.js';
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
    this.ws = null;

    // Components
    this.chatBubble = null;
    this.chatWindow = null;
    this.widgetContainer = null;

    // State
    this.conversations = new Map();
    this.isChatSessionActive = false;
    this.currentChatSession = null;

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

      // Create widget container
      this.createWidgetContainer();

      // Initialize components
      this.chatBubble = new ChatBubble(this.widgetContainer, {
        showPulseAnimation: this.config.showPulseAnimation,
        onClick: () => this.toggle(),
        onAnimationComplete: () => this.removePulse()
      });

      this.chatWindow = new ChatWindow(this.widgetContainer, {
        onClose: () => this.close(),
        onTabSwitch: (tab) => this.handleTabSwitch(tab),
        onSendMessage: (message) => this.sendMessage(message),
        onFileUpload: (file) => this.handleFileUpload(file),
        onConversationSelect: (sessionId) => this.loadConversation(sessionId),
        onBackButtonClick: () => this.backToList(),
      });

      // Load stored conversations
      await this.loadStoredConversations();

      // Initialize WebSocket if user is authenticated
      if (this.config.userJWT) {
        await this.initializeWebSocket();
      }

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

  backToList() {
    this.isChatSessionActive = false;
    this.currentChatSession = null;
    if (this.ws) {
      this.ws.disconnect();
    }
    // Update the conversation list with the latest conversations
    this.chatWindow.setConversations(Array.from(this.conversations.values()));
    this.track('back_to_list');
  }

  async initWsConversation(sessionId) {
    try {
      let wsUrl = `${this.config.wsBase}/ws/chat/${this.config.teamSlug}/`;
      if (sessionId) {
        wsUrl = `${this.config.wsBase}/ws/chat/${this.config.teamSlug}/${sessionId}/`;
      }
      this.ws = new WebSocketService(wsUrl, null, {
        onSessionState: (data) => this.handleSessionState(data),
        onMessage: (message) => this.handleWebSocketMessage(message),
        onMessageHistory: (data) => this.handleMessageHistory(data),
        onTyping: (data) => this.handleTypingIndicator(data),
        onStatusChange: (status) => this.handleAgentStatus(status),
        onError: (error) => this.handleWebSocketError(error)
      });
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
      this.track('websocket_init_error', { error: error.message });
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

    document.body.appendChild(this.widgetContainer);
  }

  async initializeWebSocket() {
    try {
      const { chatToken, wsUrl } = await this.api.getChatToken();
      this.ws = new WebSocketService(wsUrl, chatToken, {
        onMessage: (message) => this.handleWebSocketMessage(message),
        onTyping: (data) => this.handleTypingIndicator(data),
        onStatusChange: (status) => this.handleAgentStatus(status),
        onError: (error) => this.handleWebSocketError(error)
      });
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
      this.track('websocket_init_error', { error: error.message });
    }
  }

  // Public API methods
  open() {
    if (!this.isInitialized) {
      return;
    }
    this.isOpen = true;
    this.chatBubble.setOpen(true);
    this.chatWindow.show();
    this.track('widget_opened');
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

  identify(userData) {
    this.currentUser = userData;
    this.storage.setUser(userData);

    // Re-initialize WebSocket with user context
    if (userData.jwt) {
      this.config.userJWT = userData.jwt;
      this.initializeWebSocket();
    }

    this.track('user_identified', {
      userId: userData.id,
      hasEmail: !!userData.email
    });
  }

  startConversation() {
    this.initWsConversation();
    this.isChatSessionActive = true;
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
      // Validate file
      if (file.size > this.config.maxFileSize) {
        throw new Error(`File size exceeds ${this.config.maxFileSize / 1024 / 1024}MB limit`);
      }

      // Upload file
      const fileUrl = await this.api.uploadFile(file);

      // Send as message
      await this.sendMessage({
        text: `📎 ${file.name}`,
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          url: fileUrl
        }
      });

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

    // case 'server_conversation_updated':
    //   this.updateConversation(data.conversationId, data.updates);
    //   break;
    // case 'server_agent_joined':
    //   this.handleAgentJoined(data);
    //   break;
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
        this.startConversation();
        return;
      }

      this.initWsConversation(chatSessionId);
      this.isChatSessionActive = true;

      this.track('conversation_loaded', { chatSessionId });
    } catch (error) {
      console.error('Failed to load conversation:', error);
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
        serverConversations.forEach(conv => {
          this.conversations.set(conv.sessionId, conv);
          this.storage.saveConversation(conv);
        });
      }

      this.chatWindow.setConversations(Array.from(this.conversations.values()));
    } catch (error) {
      console.warn('Failed to load conversations:', error);
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

  updateConversation(chatSessionId, updates) {
    const conversation = this.conversations.get(chatSessionId);
    if (conversation) {
      Object.assign(conversation, updates);
      this.storage.saveConversation(conversation);
    }
  }

  removePulse() {
    setTimeout(() => {
      this.chatBubble.removePulse();
    }, 10000);
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
    if (this.ws) {
      this.ws.disconnect();
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
      this.instance.identify(userData);
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

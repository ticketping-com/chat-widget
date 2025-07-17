// src/services/websocket.js
import { WEBSOCKET_EVENTS } from '../constants/config.js';

export class WebSocketService {
  constructor(wsUrl, token = null, options = {}) {
    this.wsUrl = wsUrl;
    this.token = token;
    this.isAnonymous = !token;
    this.options = {
      onSessionState: () => {},
      onMessage: () => {},
      onMessageHistory: () => {},
      onTyping: () => {},
      onStatusChange: () => {},
      onError: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      ...options
    };

    this.ws = null;
    this.isConnected = false;
    this.reconnectCount = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.typingTimer = null;

    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      this.attachEventListeners();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.options.onError(error);
      this.scheduleReconnect();
    }
  }

  attachEventListeners() {
    this.ws.onopen = (event) => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectCount = 0;

      // Authenticate
      this.authenticate();

      // Start heartbeat
      this.startHeartbeat();

      this.options.onConnect(event);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.options.onError(error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();

      this.options.onDisconnect(event);

      // Attempt to reconnect unless it was a clean close
      if (event.code !== 1000 && this.reconnectCount < this.options.reconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.options.onError(error);
    };
  }

  authenticate() {
    if (this.isAnonymous) {
      // For anonymous users, send auth request without token
      this.send({
        type: WEBSOCKET_EVENTS.AUTH,
        anonymous: true
      });
    } else {
      // For authenticated users, send token
      this.send({
        type: WEBSOCKET_EVENTS.AUTH,
        token: this.token
      });
    }
  }

  handleMessage(data) {
    switch (data.type) {
    case WEBSOCKET_EVENTS.SERVER_STATE:
      this.options.onSessionState(data);
      break;

    case WEBSOCKET_EVENTS.SERVER_MESSAGE:
      this.options.onMessage(data);
      break;

    case WEBSOCKET_EVENTS.SERVER_MESSAGE_HISTORY:
      this.options.onMessageHistory(data);
      break;

    case WEBSOCKET_EVENTS.SERVER_TYPING:
      this.options.onTyping(data);
      break;

    case WEBSOCKET_EVENTS.SERVER_AGENT_STATUS:
      this.options.onStatusChange(data);
      break;

    case WEBSOCKET_EVENTS.SERVER_AGENT_JOINED:
      this.options.onStatusChange({ type: 'agent_joined', ...data });
      break;

    case WEBSOCKET_EVENTS.SERVER_AGENT_LEFT:
      this.options.onStatusChange({ type: 'agent_left', ...data });
      break;

    case WEBSOCKET_EVENTS.SERVER_CONVERSATION_UPDATED:
      this.options.onMessage(data);
      break;

    case WEBSOCKET_EVENTS.SERVER_AUTH_SUCCESS:
      console.log('WebSocket authentication successful');
      break;

    case WEBSOCKET_EVENTS.SERVER_AUTH_FAILED:
      console.error('WebSocket authentication failed');
      this.options.onError(new Error('Authentication failed'));
      this.disconnect();
      break;

    case WEBSOCKET_EVENTS.SERVER_ANONYMOUS_AUTH_SUCCESS:
      console.log('Anonymous WebSocket authentication successful');
      break;

    case WEBSOCKET_EVENTS.SERVER_ANONYMOUS_AUTH_FAILED:
      console.error('Anonymous WebSocket authentication failed');
      this.options.onError(new Error('Anonymous authentication failed'));
      this.disconnect();
      break;

    case WEBSOCKET_EVENTS.PONG:
      break;

    case WEBSOCKET_EVENTS.ERROR:
      console.error('WebSocket error:', data.message);
      this.options.onError(new Error(data.message));
      break;

    default:
      console.warn('Unknown WebSocket message type:', data.type);
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.options.onError(error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, message queued');
      // TODO: Implement message queuing
      return false;
    }
  }

  sendMessage(message) {
    return this.send({
      ...message,
      ...(message.file && { file: message.file })
    });
  }

  sendTypingStart(conversationId) {
    // Debounce typing indicators
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.send({
      type: WEBSOCKET_EVENTS.TYPING_START,
      conversationId
    });

    // Auto-stop typing after 3 seconds
    this.typingTimer = setTimeout(() => {
      this.sendTypingStop(conversationId);
    }, 3000);
  }

  sendTypingStop(conversationId) {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    this.send({
      type: WEBSOCKET_EVENTS.TYPING_STOP,
      conversationId
    });
  }

  joinConversation(conversationId) {
    return this.send({
      type: WEBSOCKET_EVENTS.JOIN_CONVERSATION,
      conversationId
    });
  }

  leaveConversation(conversationId) {
    return this.send({
      type: WEBSOCKET_EVENTS.LEAVE_CONVERSATION,
      conversationId
    });
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectCount >= this.options.reconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.options.onError(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectCount++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectCount - 1); // Exponential backoff

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectCount}`);
      this.connect();
    }, delay);
  }

  reconnect() {
    this.disconnect();
    this.reconnectCount = 0;
    this.connect();
  }

  disconnect() {
    this.isConnected = false;

    // Clear timers
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // Utility methods
  getConnectionState() {
    if (!this.ws) {
      return 'DISCONNECTED';
    }

    switch (this.ws.readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'CONNECTED';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CLOSED:
      return 'DISCONNECTED';
    default:
      return 'UNKNOWN';
    }
  }

  isAnonymousUser() {
    return this.isAnonymous;
  }

  isWsConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Event subscription for external components
  on(eventType, callback) {
    switch (eventType) {
    case 'message':
      this.options.onMessage = callback;
      break;
    case 'typing':
      this.options.onTyping = callback;
      break;
    case 'status':
      this.options.onStatusChange = callback;
      break;
    case 'error':
      this.options.onError = callback;
      break;
    case 'connect':
      this.options.onConnect = callback;
      break;
    case 'disconnect':
      this.options.onDisconnect = callback;
      break;
    default:
      console.warn('Unknown event type:', eventType);
    }
  }

  // Cleanup
  destroy() {
    this.disconnect();
  }
}

// src/services/notification-websocket.js
// Persistent WebSocket connection for receiving notifications across all conversations

export class NotificationWS {
  constructor(wsUrl, options = {}) {
    this.wsUrl = wsUrl;
    this.options = {
      onUnreadCount: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      onError: () => {},
      reconnectAttempts: 10,
      reconnectDelay: 2000,
      heartbeatInterval: 30000,
      ...options
    };

    this.ws = null;
    this.isConnected = false;
    this.reconnectCount = 0;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.shouldReconnect = true;

    this.connect();
  }

  connect() {
    if (!this.shouldReconnect) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.attachEventListeners();
    } catch (error) {
      console.error('Notification WebSocket connection failed:', error);
      this.options.onError(error);
      this.scheduleReconnect();
    }
  }

  attachEventListeners() {
    this.ws.onopen = () => {
      console.log('Notification WebSocket connected');
      this.isConnected = true;
      this.reconnectCount = 0;

      // Start heartbeat
      this.startHeartbeat();

      // Request initial unread count
      this.requestUnreadCount();

      this.options.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse notification message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('Notification WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();

      this.options.onDisconnect(event);
      console.log(event);
      // Only reconnect on network errors (unclean close), not server-initiated closes
      // Server may close connection for anon users or other policy reasons - don't retry
      const isNetworkError = event.code !== 1000 && event.code !== 1006;
      if (this.shouldReconnect && isNetworkError) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('Notification WebSocket error:', error);
      this.options.onError(error);
    };
  }

  handleMessage(data) {
    switch (data.type) {
    case 'unread_count':
      this.options.onUnreadCount(data.count);
      break;

    case 'pong':
      // Heartbeat response, no action needed
      break;

    default:
      console.log('Unknown notification message type:', data.type);
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to send notification message:', error);
        return false;
      }
    }
    return false;
  }

  requestUnreadCount() {
    return this.send({ type: 'get_unread_count' });
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
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectCount >= this.options.reconnectAttempts) {
      console.error('Notification WebSocket: Max reconnection attempts reached');
      return;
    }

    this.reconnectCount++;
    const delay = this.options.reconnectDelay * Math.pow(1.5, this.reconnectCount - 1);

    console.log(`Notification WebSocket: Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    this.isConnected = false;

    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isWsConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  destroy() {
    this.disconnect();
  }
}


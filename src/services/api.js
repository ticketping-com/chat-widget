// src/services/api.js
import { API_ENDPOINTS } from '../constants/config.js';

export class ApiService {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.apiBase;
    this.token = config.userJWT;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authorization header if token is available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add app ID header
    if (this.config.appId) {
      headers['X-App-ID'] = this.config.appId;
    }

    const requestOptions = {
      method: 'GET',
      headers,
      ...options
    };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async getChatToken() {
    const response = await this.request(API_ENDPOINTS.auth, {
      method: 'POST',
      body: JSON.stringify({
        appId: this.config.appId,
        userJWT: this.token
      })
    });

    return {
      chatToken: response.chatToken,
      wsUrl: response.wsUrl || this.config.wsUrl
    };
  }

  // Conversations
  async getConversations(limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    return await this.request(`${API_ENDPOINTS.conversations}?${params}`);
  }

  async getConversation(conversationId) {
    return await this.request(`${API_ENDPOINTS.conversations}/${conversationId}`);
  }

  async createConversation(data = {}) {
    return await this.request(API_ENDPOINTS.conversations, {
      method: 'POST',
      body: JSON.stringify({
        appId: this.config.appId,
        ...data
      })
    });
  }

  async updateConversation(conversationId, updates) {
    return await this.request(`${API_ENDPOINTS.conversations}/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Messages
  async getMessages(conversationId, limit = 50, before = null) {
    const params = new URLSearchParams({
      conversationId,
      limit: limit.toString()
    });

    if (before) {
      params.append('before', before);
    }

    return await this.request(`${API_ENDPOINTS.messages}?${params}`);
  }

  async sendMessage(message) {
    return await this.request(API_ENDPOINTS.messages, {
      method: 'POST',
      body: JSON.stringify({
        conversationId: message.conversationId,
        text: message.text,
        type: message.type || 'user',
        timestamp: message.timestamp,
        messageId: message.id,
        ...(message.file && { file: message.file })
      })
    });
  }

  async markAsRead(conversationId, messageId) {
    return await this.request(`${API_ENDPOINTS.messages}/${messageId}/read`, {
      method: 'POST',
      body: JSON.stringify({ conversationId })
    });
  }

  // File upload
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('appId', this.config.appId);

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.config.appId) {
      headers['X-App-ID'] = this.config.appId;
    }

    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.upload}`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Analytics
  async track(event, data = {}) {
    try {
      await this.request(API_ENDPOINTS.analytics, {
        method: 'POST',
        body: JSON.stringify({
          event,
          data: {
            ...data,
            appId: this.config.appId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        })
      });
    } catch (error) {
      // Don't throw on analytics failures
      console.warn('Analytics tracking failed:', error);
    }
  }

  // User management
  async identifyUser(userData) {
    return await this.request('/users/identify', {
      method: 'POST',
      body: JSON.stringify({
        appId: this.config.appId,
        ...userData
      })
    });
  }

  async updateUser(updates) {
    return await this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Agent status
  async getAgentStatus() {
    return await this.request('/agents/status');
  }

  // Help articles (if integrated)
  async getHelpArticles(query = '', limit = 5) {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      appId: this.config.appId
    });

    return await this.request(`/help/articles?${params}`);
  }

  async searchHelpArticles(query) {
    return await this.request('/help/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        appId: this.config.appId
      })
    });
  }

  // Utility methods
  setToken(token) {
    this.token = token;
  }

  setAppId(appId) {
    this.config.appId = appId;
  }

  // Error handling helpers
  isNetworkError(error) {
    return error instanceof TypeError && error.message.includes('fetch');
  }

  isAuthError(error) {
    return error.message.includes('401') || error.message.includes('Unauthorized');
  }

  isRateLimitError(error) {
    return error.message.includes('429') || error.message.includes('Too Many Requests');
  }

  // Retry mechanism for failed requests
  async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.request(endpoint, options);
      } catch (error) {
        lastError = error;

        // Don't retry auth errors or client errors (4xx)
        if (this.isAuthError(error) || (error.message.includes('4') && !this.isRateLimitError(error))) {
          throw error;
        }

        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Batch operations
  async batchRequest(requests) {
    return await this.request('/batch', {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  }

  // Pagination helper
  async getPaginatedData(endpoint, options = {}) {
    const {
      limit = 50,
      maxItems = 200,
      onPage = () => {}
    } = options;

    const results = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && results.length < maxItems) {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await this.request(`${endpoint}?${params}`);
      const items = response.data || response.items || response;

      results.push(...items);
      onPage(items, offset);

      hasMore = items.length === limit;
      offset += limit;
    }

    return results.slice(0, maxItems);
  }

  // Health check
  async healthCheck() {
    try {
      await this.request('/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}
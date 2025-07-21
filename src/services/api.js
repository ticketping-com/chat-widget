// src/services/api.js
import { API_ENDPOINTS } from '../constants/config.js';

// Cookie key for storing chatJWT
const TP_CHAT_JWT_COOKIE_KEY = 'ticketping_chat_jwt';

export class ApiService {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.apiBase;
  }

  // Cookie utility methods
  setCookie(name, value, hours) {
    const date = new Date();
    date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
  }

  getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add app ID header
    if (this.config.appId) {
      headers['x-tpwidget-id'] = this.config.appId;
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

      // If it's an auth error, clear the cached token so we fetch a new one next time
      if (this.isAuthError(error)) {
        this.clearChatToken();
      }

      throw error;
    }
  }

  // Authentication
  async getChatToken() {
    // Check if we have a valid chatJWT in cookies first
    const cachedJWT = this.getCookie(TP_CHAT_JWT_COOKIE_KEY);
    if (cachedJWT) {
      try {
        // Basic JWT validation - check if it's not expired
        const payload = JSON.parse(atob(cachedJWT.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        // If token is still valid (not expired), return it
        if (payload.exp && payload.exp > currentTime) {
          return {
            chatJWT: cachedJWT,
          };
        }
      } catch (error) {
        console.log('error', error);
        // Invalid JWT format, continue to fetch new token
        console.warn('Invalid cached JWT format, fetching new token');
        this.deleteCookie(TP_CHAT_JWT_COOKIE_KEY);
      }
    }

    // Fetch new token from server
    const params = new URLSearchParams({
      jwt: this.config.userJWT,
      team: this.config.teamSlug,
    });
    const response = await this.request(`${API_ENDPOINTS.auth}?${params}`, {
      method: 'GET',
    });

    // Store the new token in cookies for 6 hours
    if (response.jwt) {
      this.setCookie(TP_CHAT_JWT_COOKIE_KEY, response.jwt, 6);
    }

    return {
      chatJWT: response.jwt,
    };
  }

  // Clear cached chat token (useful when token becomes invalid)
  clearChatToken() {
    this.deleteCookie(TP_CHAT_JWT_COOKIE_KEY);
  }

  // Conversations
  async getConversations(limit = 50, offset = 0) {
    const { chatJWT } = await this.getChatToken();
    const headers = {
      'Authorization': `Bearer ${chatJWT}`,
      'Content-Type': 'application/json'
    };
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    return await this.request(`${API_ENDPOINTS.conversations}?${params}`, { headers });
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
      headers['x-tpwidget-id'] = this.config.appId;
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
  async identifyUser() {
    return await this.request('/users/identify', {
      method: 'POST',
      body: JSON.stringify({
        appId: this.config.appId,
        userJWT: this.config.userJWT
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

// src/services/storage.js
import { STORAGE_KEYS } from '../constants/config.js';

export class StorageService {
  constructor() {
    this.isAvailable = this.checkStorageAvailability();
    this.deviceId = this.getOrCreateDeviceId();
  }

  checkStorageAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available, using memory storage');
      this.memoryStorage = new Map();
      return false;
    }
  }

  getOrCreateDeviceId() {
    let deviceId = this.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }

  setItem(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      if (this.isAvailable) {
        localStorage.setItem(key, serializedValue);
      } else {
        this.memoryStorage.set(key, serializedValue);
      }
    } catch (error) {
      console.warn('Failed to store item:', key, error);
    }
  }

  getItem(key) {
    try {
      let serializedValue;
      if (this.isAvailable) {
        serializedValue = localStorage.getItem(key);
      } else {
        serializedValue = this.memoryStorage.get(key);
      }

      return serializedValue ? JSON.parse(serializedValue) : null;
    } catch (error) {
      console.warn('Failed to retrieve item:', key, error);
      return null;
    }
  }

  removeItem(key) {
    try {
      if (this.isAvailable) {
        localStorage.removeItem(key);
      } else {
        this.memoryStorage.delete(key);
      }
    } catch (error) {
      console.warn('Failed to remove item:', key, error);
    }
  }

  clear() {
    try {
      if (this.isAvailable) {
        // Only clear Ticketping keys
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      } else {
        this.memoryStorage.clear();
      }
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  // Conversation management
  saveConversation(conversation) {
    const conversations = this.getConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.push(conversation);
    }

    // Keep only the most recent conversations
    const maxConversations = 50;
    if (conversations.length > maxConversations) {
      conversations.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
      conversations.splice(maxConversations);
    }

    this.setItem(STORAGE_KEYS.CONVERSATIONS, conversations);
  }

  getConversations() {
    return this.getItem(STORAGE_KEYS.CONVERSATIONS) || [];
  }

  getConversation(conversationId) {
    const conversations = this.getConversations();
    return conversations.find(c => c.id === conversationId);
  }

  deleteConversation(conversationId) {
    const conversations = this.getConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    this.setItem(STORAGE_KEYS.CONVERSATIONS, filtered);
  }

  // User management
  setUser(userData) {
    this.setItem(STORAGE_KEYS.USER_DATA, {
      ...userData,
      lastSeen: new Date().toISOString()
    });
  }

  getUser() {
    return this.getItem(STORAGE_KEYS.USER_DATA);
  }

  clearUser() {
    this.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // Settings management
  saveSettings(settings) {
    const currentSettings = this.getSettings();
    this.setItem(STORAGE_KEYS.SETTINGS, {
      ...currentSettings,
      ...settings
    });
  }

  getSettings() {
    return this.getItem(STORAGE_KEYS.SETTINGS) || {};
  }

  getSetting(key, defaultValue = null) {
    const settings = this.getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }

  setSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    this.setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  // Data cleanup
  cleanupOldData(maxAge = 30) {
    const conversations = this.getConversations();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const filteredConversations = conversations.filter(conversation => {
      const conversationDate = new Date(conversation.updatedAt || conversation.createdAt);
      return conversationDate > cutoffDate;
    });

    if (filteredConversations.length !== conversations.length) {
      this.setItem(STORAGE_KEYS.CONVERSATIONS, filteredConversations);
      console.log(`Cleaned up ${conversations.length - filteredConversations.length} old conversations`);
    }
  }

  // Export/Import functionality
  exportData() {
    return {
      conversations: this.getConversations(),
      user: this.getUser(),
      settings: this.getSettings(),
      deviceId: this.deviceId,
      exportedAt: new Date().toISOString()
    };
  }

  importData(data) {
    try {
      if (data.conversations) {
        this.setItem(STORAGE_KEYS.CONVERSATIONS, data.conversations);
      }
      if (data.user) {
        this.setItem(STORAGE_KEYS.USER_DATA, data.user);
      }
      if (data.settings) {
        this.setItem(STORAGE_KEYS.SETTINGS, data.settings);
      }
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Storage size management
  getStorageSize() {
    if (!this.isAvailable) {
      return 0;
    }

    let total = 0;
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        total += item.length;
      }
    });

    return total;
  }

  getStorageSizeHuman() {
    const bytes = this.getStorageSize();
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Migration support
  migrateData(fromVersion, toVersion) {
    console.log(`Migrating storage from version ${fromVersion} to ${toVersion}`);

    // Example migration logic
    if (fromVersion === '1.0.0' && toVersion === '1.1.0') {
      // Migrate conversation structure
      const conversations = this.getConversations();
      const migratedConversations = conversations.map(conv => ({
        ...conv,
        version: '1.1.0',
        // Add new fields or transform existing ones
      }));
      this.setItem(STORAGE_KEYS.CONVERSATIONS, migratedConversations);
    }
  }

  // Privacy compliance
  clearPersonalData() {
    this.clearUser();
    const conversations = this.getConversations();
    const anonymizedConversations = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg => ({
        ...msg,
        // Remove personally identifiable information
        text: msg.type === 'user' ? '[User message removed]' : msg.text
      }))
    }));
    this.setItem(STORAGE_KEYS.CONVERSATIONS, anonymizedConversations);
  }

  // Utility methods
  hasData() {
    return this.getConversations().length > 0 || this.getUser() !== null;
  }

  getDataSummary() {
    return {
      conversationCount: this.getConversations().length,
      hasUser: this.getUser() !== null,
      storageSize: this.getStorageSizeHuman(),
      deviceId: this.deviceId
    };
  }
}

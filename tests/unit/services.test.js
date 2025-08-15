import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from '../../src/services/storage.js';
import { ApiService } from '../../src/services/api.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index) => Object.keys(store)[index] || null)
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock fetch for API tests
global.fetch = vi.fn();

describe('StorageService', () => {
  let storageService;

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    storageService = new StorageService();
    // Clear the mocks after initialization to ignore setup calls
    vi.clearAllMocks();
  });

  describe('User Data Management', () => {
    it('should save user data', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      storageService.setUser(userData);

      // setUser adds a lastSeen timestamp, so we need to check it was called with the modified data
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_user',
        expect.stringContaining('"id":"user-123"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_user',
        expect.stringContaining('"lastSeen"')
      );
    });

    it('should retrieve user data', () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));

      const result = storageService.getUser();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ticketping_user');
      expect(result).toEqual(userData);
    });

    it('should return null for missing user data', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = storageService.getUser();

      expect(result).toBe(null);
    });

    it('should handle invalid JSON in user data', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = storageService.getUser();

      expect(result).toBe(null);
    });

    it('should clear user data', () => {
      storageService.clearUser();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ticketping_user');
    });
  });

  describe('Conversation Management', () => {
    it('should save conversation', () => {
      const conversation = {
        sessionId: 'session-123',
        messages: [
          { id: 'msg-1', text: 'Hello', sender: 'USER' }
        ],
        created: new Date().toISOString()
      };

      storageService.saveConversation(conversation);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_conversations',
        JSON.stringify([conversation])
      );
    });

    it('should retrieve conversations', () => {
      const conversations = [
        {
          sessionId: 'session-123',
          messages: [],
          created: new Date().toISOString()
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(conversations));

      const result = storageService.getConversations();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ticketping_conversations');
      expect(result).toEqual(conversations);
    });

    it('should return empty array for missing conversations', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = storageService.getConversations();

      expect(result).toEqual([]);
    });

    it('should update existing conversation', () => {
      const existingConversations = [
        {
          sessionId: 'session-123',
          messages: [{ id: 'msg-1', text: 'Hello' }],
          created: '2024-01-01T00:00:00Z'
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingConversations));

      const updatedConversation = {
        sessionId: 'session-123',
        messages: [
          { id: 'msg-1', text: 'Hello' },
          { id: 'msg-2', text: 'Hi there' }
        ],
        created: '2024-01-01T00:00:00Z'
      };

      storageService.saveConversation(updatedConversation);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_conversations',
        JSON.stringify([updatedConversation])
      );
    });

    it('should add new conversation to existing list', () => {
      const existingConversations = [
        { sessionId: 'session-123', messages: [], created: '2024-01-01T00:00:00Z' }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingConversations));

      const newConversation = {
        sessionId: 'session-456',
        messages: [],
        created: '2024-01-02T00:00:00Z'
      };

      storageService.saveConversation(newConversation);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_conversations',
        JSON.stringify([...existingConversations, newConversation])
      );
    });

    it('should clear conversations', () => {
      storageService.clearConversations();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ticketping_conversations');
    });
  });

  describe('Settings Management', () => {
    it('should save settings', () => {
      const settings = {
        soundEnabled: false,
        theme: 'dark',
        position: 'bottom-left'
      };

      storageService.setSettings(settings);

      // setSettings merges with existing settings, so check that it was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_settings',
        expect.stringContaining('"soundEnabled":false')
      );
    });

    it('should retrieve settings', () => {
      const settings = {
        soundEnabled: false,
        theme: 'dark'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(settings));

      const result = storageService.getSettings();

      expect(result).toEqual(settings);
    });

    it('should return empty object for missing settings', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = storageService.getSettings();

      expect(result).toEqual({});
    });
  });

  describe('Device ID Management', () => {
    it('should generate and store device ID', () => {
      // Create a new service with no existing device ID
      localStorageMock.getItem.mockReturnValue(null);
      vi.clearAllMocks(); // Clear before creating service

      const newStorageService = new StorageService();
      const deviceId = newStorageService.getDeviceId();

      expect(typeof deviceId).toBe('string');
      expect(deviceId.length).toBeGreaterThan(10);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ticketping_device_id',
        JSON.stringify(deviceId)
      );
    });

    it('should return existing device ID', () => {
      const existingId = 'existing-device-id';

      // Set up mock before creating a new service
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingId));
      const testStorageService = new StorageService();
      vi.clearAllMocks(); // Clear the constructor calls

      const deviceId = testStorageService.getDeviceId();

      expect(deviceId).toBe(existingId);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        storageService.setUser({ id: 'test' });
      }).not.toThrow();
    });

    it('should handle JSON parse errors', () => {
      localStorageMock.getItem.mockReturnValue('invalid{json');

      const result = storageService.getConversations();

      expect(result).toEqual([]);
    });
  });
});

describe('ApiService', () => {
  let apiService;
  let config;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      appId: 'test-app-id',
      teamSlug: 'test-team',
      apiBase: 'https://api.example.com',
      userJWT: 'test-jwt-token'
    };
    apiService = new ApiService(config);
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(apiService.config).toEqual(config);
    });

    it('should set base URL correctly', () => {
      expect(apiService.baseURL).toBe('https://api.example.com');
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.get('/test-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request with data', async () => {
      const mockResponse = { success: true };
      const postData = { message: 'Hello' };

      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.post('/messages', postData);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(postData)
        })
      );
      expect(result).toEqual(mockResponse);
    });



    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid request' })
      });

      await expect(apiService.get('/error-endpoint')).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('Authentication', () => {
    it('should get chat token', async () => {
      const mockToken = { jwt: 'chat-token-123' };
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockToken)
      });

      // Mock document.cookie to avoid URL constructor issues
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: ''
      });

      const result = await apiService.getChatToken();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/jwt/auth/?jwt=test-jwt-token&team=test-team'),
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual({ chatJWT: 'chat-token-123' });
    });
  });

  describe('Conversation Management', () => {
    it('should get conversations', async () => {
      const mockConversations = {
        results: [
          { sessionId: 'session-1', messages: [] }
        ]
      };

      // First mock for getChatToken call
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ chatJWT: 'test-chat-jwt' })
      });

      // Second mock for getConversations call
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockConversations)
      });

      // Mock document.cookie to avoid URL constructor issues
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: ''
      });

      const result = await apiService.getConversations();

      expect(result).toEqual(mockConversations);
    });

    it('should send message', async () => {
      const message = {
        sessionId: 'session-123',
        text: 'Hello world',
        sender: 'USER'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true })
      });

      await apiService.sendMessage(message);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"text":"Hello world"')
        })
      );
    });
  });

  describe('File Upload', () => {
    it('should upload file', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockResponse = { url: 'https://example.com/file.txt' };

      // Mock getChatToken to avoid authentication complexity in this test
      vi.spyOn(apiService, 'getChatToken').mockResolvedValue({
        chatJWT: 'mock-chat-jwt'
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.uploadFile(mockFile, 'session-123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/chat-session/file-upload/'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
      expect(result).toBe(mockResponse.url);
    });
  });

  // describe('Analytics', () => {
  //   it('should track events', async () => {
  //     const eventData = {
  //       event: 'widget_opened',
  //       timestamp: new Date().toISOString()
  //     };

  //     fetch.mockResolvedValueOnce({
  //       ok: true,
  //       headers: new global.Headers({ 'content-type': 'application/json' }),
  //       json: () => Promise.resolve({ success: true })
  //     });

  //     await apiService.track('widget_opened', eventData);

  //     expect(fetch).toHaveBeenCalledWith(
  //       'https://api.example.com/analytics',
  //       expect.objectContaining({
  //         method: 'POST',
  //         body: expect.stringContaining('"event":"widget_opened"')
  //       })
  //     );
  //   });
  // });

  describe('Request Configuration', () => {
    it('should handle requests without JWT token', () => {
      const configWithoutJWT = { ...config, userJWT: null };
      const apiServiceNoJWT = new ApiService(configWithoutJWT);

      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({})
      });

      apiServiceNoJWT.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });

    it('should handle empty response bodies', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(null)
      });

      const result = await apiService.get('/empty-response');

      expect(result).toBe(null);
    });

    it('should handle non-JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: new global.Headers({ 'content-type': 'text/plain' }),
        json: () => Promise.reject(new Error('Not JSON'))
      });

      await expect(apiService.get('/non-json')).rejects.toThrow();
    });
  });
});

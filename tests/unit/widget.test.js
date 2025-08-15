import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TicketpingChat from '../../src/widget.js';

// The widget.js module should set up the global API on import

// Mock console methods to avoid noise in tests
const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('TicketpingChat Widget', () => {
  let widget;

  beforeEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';

    // Reset any existing widget instances
    if (window.TicketpingChat.instance) {
      window.TicketpingChat.instance = null;
    }

    // Clear any applied CSS custom properties
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    // Clean up widget instance
    if (widget && typeof widget.destroy === 'function') {
      widget.destroy();
    }

    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {


    it('should merge default config with provided config', () => {
      widget = new TicketpingChat({
        appId: 'test-app-id',
        teamSlug: 'test-team',
        showPulseAnimation: false,
        position: 'bottom-left'
      });

      expect(widget.config.showPulseAnimation).toBe(false);
      expect(widget.config.position).toBe('bottom-left');
      expect(widget.config.apiBase).toBe('https://api.ticketping.com'); // default value
    });




  });

  describe('Theme Application', () => {




    it('should not apply theme if not provided', () => {
      widget = new TicketpingChat({
        appId: 'test-app-id',
        teamSlug: 'test-team'
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--tp-primary-color')).toBe('');
    });
  });



  describe('User Identification', () => {
    beforeEach(() => {
      widget = new TicketpingChat({
        appId: 'test-app-id',
        teamSlug: 'test-team'
      });
    });

    it('should identify user with data', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      await widget.identify(userData);

      expect(widget.currentUser).toEqual(userData);
    });

    it('should handle JWT token in user data', async () => {
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        userJWT: 'valid-jwt-token'
      };

      // Mock the auth-dependent methods to avoid API calls
      vi.spyOn(widget, 'loadAuthenticatedUserData').mockResolvedValue();
      vi.spyOn(widget, 'reinitializeWebSocketIfNeeded').mockResolvedValue();

      await widget.identify(userData);

      expect(widget.config.userJWT).toBe('valid-jwt-token');
      expect(widget.loadAuthenticatedUserData).toHaveBeenCalled();
      expect(widget.reinitializeWebSocketIfNeeded).toHaveBeenCalled();
    });

    it('should load authenticated user conversations', async () => {
      const mockConversations = {
        results: [
          { sessionId: 'conv-1', messages: [], created: '2023-01-01T00:00:00Z' },
          { sessionId: 'conv-2', messages: [], created: '2023-01-02T00:00:00Z' }
        ]
      };

      // Mock API call
      vi.spyOn(widget.api, 'getConversations').mockResolvedValue(mockConversations);

      // Set userJWT to enable auth functionality
      widget.config.userJWT = 'valid-jwt-token';

      await widget.loadAuthenticatedUserData();

      expect(widget.conversations.size).toBe(2);
      expect(widget.conversations.has('conv-1')).toBe(true);
      expect(widget.conversations.has('conv-2')).toBe(true);
    });
  });

  describe('Conversation Management', () => {
    beforeEach(() => {
      widget = new TicketpingChat({
        appId: 'test-app-id',
        teamSlug: 'test-team'
      });

      // Mock API service methods
      vi.spyOn(widget.api, 'createChatSession').mockResolvedValue({
        sessionId: 'test-session-123'
      });

      // Mock WebSocket initialization to avoid timeout
      vi.spyOn(widget, 'initWsConversation').mockResolvedValue();
    });

    it('should start conversation', async () => {
      await widget.startConversation();
      expect(widget.isChatSessionActive).toBe(true);
      expect(widget.currentChatSession).toBe('test-session-123');
    });

    it('should add message to conversation', () => {
      const sessionId = 'session-123';
      const message = {
        id: 'msg-1',
        text: 'Hello world',
        sender: 'USER',
        created: new Date().toISOString()
      };

      // Initialize conversation
      widget.conversations.set(sessionId, {
        sessionId,
        messages: [],
        created: new Date().toISOString()
      });

      widget.addMessageToConversation(sessionId, message);

      const conversation = widget.conversations.get(sessionId);
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0]).toEqual(message);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', () => {
      expect(() => {
        widget = new TicketpingChat({
          // Missing required appId and teamSlug
        });
      }).not.toThrow();
    });

    it('should not crash on missing DOM elements', () => {
      widget = new TicketpingChat({
        appId: 'test-app-id',
        teamSlug: 'test-team'
      });

      expect(() => {
        widget.open();
        widget.close();
      }).not.toThrow();
    });
  });


});

describe('Global API', () => {
  beforeEach(() => {
    // Clean up any existing instances
    if (window.TicketpingChat.instance) {
      window.TicketpingChat.instance.destroy();
      window.TicketpingChat.instance = null;
    }
  });

  afterEach(() => {
    // Clean up
    if (window.TicketpingChat.instance) {
      window.TicketpingChat.instance.destroy();
      window.TicketpingChat.instance = null;
    }
  });

  it('should initialize via global API', () => {
    const instance = window.TicketpingChat.init({
      appId: 'test-app-id',
      teamSlug: 'test-team'
    });

    expect(instance).toBeTruthy();
    expect(window.TicketpingChat.instance).toBe(instance);
  });

  it('should not create multiple instances', () => {
    const instance1 = window.TicketpingChat.init({
      appId: 'test-app-id',
      teamSlug: 'test-team'
    });

    const instance2 = window.TicketpingChat.init({
      appId: 'test-app-id-2',
      teamSlug: 'test-team-2'
    });

    expect(instance1).toBe(instance2);
    expect(consoleWarnMock).toHaveBeenCalledWith('TicketpingChat already initialized');
  });

  it('should expose version information', () => {
    expect(window.TicketpingChat.version).toBe('dev');
  });
});

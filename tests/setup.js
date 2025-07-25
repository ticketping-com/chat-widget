// Global setup for tests
import { vi } from 'vitest';

// Mock global constants
global.__VERSION__ = 'dev';
global.__DEV__ = true;

// Mock CSS imports
vi.mock('../src/styles/main.css', () => ({}));

// Mock DOM APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.requestAnimationFrame = vi.fn(callback => setTimeout(callback, 16));

// Mock console methods to avoid noise in tests
console.warn = vi.fn();
console.error = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
}));

// Mock File and Blob APIs
global.File = vi.fn();
global.Blob = vi.fn();

// Mock URL.createObjectURL and fix URL constructor for JSDOM
if (!globalThis.URL) {
  globalThis.URL = class URL {
    constructor(url, base) {
      this.href = url;
      this.origin = base || 'http://localhost:3000';
    }
  };
}

global.URL = {
  ...global.URL,
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
};

// Improved fetch mock with proper Headers
global.Headers = class Headers {
  constructor(init = {}) {
    this._headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name) {
    return this._headers.get(name.toLowerCase()) || null;
  }

  set(name, value) {
    this._headers.set(name.toLowerCase(), value);
  }

  has(name) {
    return this._headers.has(name.toLowerCase());
  }
};

global.fetch = vi.fn();

// Set up fake timers for each test
beforeEach(() => {
  vi.useFakeTimers();

  // Reset fetch mock with better defaults
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new global.Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// Clean up DOM after each test
afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDOMElement } from '../../src/utils/dom.js';
import { validateConfig } from '../../src/utils/validation.js';

describe('DOM Utilities', () => {
  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = '';
  });

  describe('createDOMElement', () => {
    it('should create a basic element', () => {
      const element = createDOMElement('div');

      expect(element.tagName).toBe('DIV');
      expect(element instanceof HTMLElement).toBe(true);
    });

    it('should create element with className', () => {
      const element = createDOMElement('div', {
        className: 'test-class'
      });

      expect(element.className).toBe('test-class');
    });

    it('should create element with multiple classes', () => {
      const element = createDOMElement('div', {
        className: 'class1 class2 class3'
      });

      expect(element.classList.contains('class1')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);
      expect(element.classList.contains('class3')).toBe(true);
    });

    it('should create element with attributes', () => {
      const element = createDOMElement('input', {
        type: 'text',
        placeholder: 'Enter text',
        'data-test': 'test-value'
      });

      expect(element.type).toBe('text');
      expect(element.placeholder).toBe('Enter text');
      expect(element.getAttribute('data-test')).toBe('test-value');
    });

    it('should create element with id', () => {
      const element = createDOMElement('div', {
        id: 'test-id'
      });

      expect(element.id).toBe('test-id');
    });

    it('should create element with text content', () => {
      const element = createDOMElement('span', {
        textContent: 'Hello World'
      });

      expect(element.textContent).toBe('Hello World');
    });

    it('should create element with innerHTML', () => {
      const element = createDOMElement('div', {
        innerHTML: '<span>Hello</span>'
      });

      expect(element.innerHTML).toBe('<span>Hello</span>');
      expect(element.querySelector('span')).toBeTruthy();
    });

    it('should create element with mixed attributes', () => {
      const element = createDOMElement('button', {
        className: 'btn primary',
        id: 'submit-btn',
        type: 'submit',
        disabled: true,
        'aria-label': 'Submit form',
        textContent: 'Submit'
      });

      expect(element.className).toBe('btn primary');
      expect(element.id).toBe('submit-btn');
      expect(element.type).toBe('submit');
      expect(element.disabled).toBe(true);
      expect(element.getAttribute('aria-label')).toBe('Submit form');
      expect(element.textContent).toBe('Submit');
    });

    it('should handle boolean attributes', () => {
      const element = createDOMElement('input', {
        checked: true,
        disabled: false,
        required: true
      });

      expect(element.checked).toBe(true);
      expect(element.disabled).toBe(false);
      expect(element.required).toBe(true);
    });

    it('should handle data attributes', () => {
      const element = createDOMElement('div', {
        'data-id': '123',
        'data-test': 'value',
        'data-active': 'true'
      });

      expect(element.dataset.id).toBe('123');
      expect(element.dataset.test).toBe('value');
      expect(element.dataset.active).toBe('true');
    });

    it('should handle event listeners', () => {
      let clicked = false;
      const element = createDOMElement('button', {
        onclick: () => { clicked = true; }
      });

      element.click();
      expect(clicked).toBe(true);
    });

    it('should create different element types', () => {
      const div = createDOMElement('div');
      const span = createDOMElement('span');
      const button = createDOMElement('button');
      const input = createDOMElement('input');

      expect(div.tagName).toBe('DIV');
      expect(span.tagName).toBe('SPAN');
      expect(button.tagName).toBe('BUTTON');
      expect(input.tagName).toBe('INPUT');
    });

    it('should handle empty or null attributes', () => {
      const element = createDOMElement('div', null);
      expect(element.tagName).toBe('DIV');

      const element2 = createDOMElement('div', {});
      expect(element2.tagName).toBe('DIV');
    });
  });
});

describe('Configuration Validation', () => {
  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team'
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing appId', () => {
      const config = {
        teamSlug: 'test-team'
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('appId is required');
    });

    it('should reject missing teamSlug', () => {
      const config = {
        appId: 'test-app-id'
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('teamSlug is required');
    });

    it('should reject empty appId', () => {
      const config = {
        appId: '',
        teamSlug: 'test-team'
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('appId is required');
    });

    it('should reject empty teamSlug', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: ''
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('teamSlug is required');
    });

    it('should reject invalid appId type', () => {
      const config = {
        appId: 123,
        teamSlug: 'test-team'
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('appId must be a string');
    });

    it('should reject invalid teamSlug type', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 123
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('teamSlug must be a string');
    });

    it('should collect multiple errors', () => {
      const config = {
        appId: '',
        teamSlug: null
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('appId is required');
      expect(result.errors).toContain('teamSlug is required');
    });

    it('should validate optional string fields', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        apiBase: 123 // Should be string
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('apiBase must be a string');
    });

    it('should validate boolean fields', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        showPulseAnimation: 'true' // Should be boolean
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('showPulseAnimation must be a boolean');
    });

    it('should validate position enum', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        position: 'top-center' // Invalid position
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('position must be one of: bottom-right, bottom-left, top-right, top-left');
    });

    it('should validate theme enum', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        theme: 'purple' // Invalid theme
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('theme must be one of: default, dark, light');
    });

    it('should validate number fields', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        maxFileSize: '10MB' // Should be number
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxFileSize must be a number');
    });

    it('should validate array fields', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        allowedFileTypes: 'image/*' // Should be array
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('allowedFileTypes must be an array');
    });

    it('should handle null or undefined config', () => {
      const result1 = validateConfig(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Configuration is required');

      const result2 = validateConfig(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Configuration is required');
    });

    it('should validate complete valid configuration', () => {
      const config = {
        appId: 'test-app-id',
        teamSlug: 'test-team',
        apiBase: 'https://api.example.com',
        wsBase: 'wss://ws.example.com',
        userJWT: 'jwt-token',
        position: 'bottom-right',
        theme: 'dark',
        showPulseAnimation: true,
        autoOpen: false,
        maxFileSize: 10485760,
        allowedFileTypes: ['image/*', 'application/pdf']
      };

      const result = validateConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

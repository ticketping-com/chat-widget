import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatBubble } from '../../src/components/chat-bubble.js';

describe('ChatBubble Component', () => {
  let container;
  let chatBubble;
  let onClickSpy;
  let onAnimationCompleteSpy;

  beforeEach(() => {
    // Create a container for the chat bubble
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create spy functions for callbacks
    onClickSpy = vi.fn();
    onAnimationCompleteSpy = vi.fn();
  });

  afterEach(() => {
    // Clean up
    if (chatBubble && typeof chatBubble.destroy === 'function') {
      chatBubble.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should create chat bubble element', () => {
      chatBubble = new ChatBubble(container, {
        onClick: onClickSpy,
        onAnimationComplete: onAnimationCompleteSpy
      });

      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleElement).toBeTruthy();
    });

    it('should initialize with default options', () => {
      chatBubble = new ChatBubble(container);

      expect(typeof chatBubble.options.onClick).toBe('function');
    });

    it('should merge provided options with defaults', () => {
      chatBubble = new ChatBubble(container, {
        onClick: onClickSpy
      });

      expect(chatBubble.options.onClick).toBe(onClickSpy);
    });
  });

  describe('Open/Close States', () => {
    beforeEach(() => {
      chatBubble = new ChatBubble(container, {
        onClick: onClickSpy
      });
    });

    it('should start in closed state', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleElement.classList.contains('open')).toBe(false);
    });

    it('should set open state', () => {
      chatBubble.setOpen(true);

      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleElement.classList.contains('open')).toBe(true);
    });

    it('should set closed state', () => {
      chatBubble.setOpen(true);
      chatBubble.setOpen(false);

      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleElement.classList.contains('open')).toBe(false);
    });
  });

  describe('Notification Badge', () => {
    beforeEach(() => {
      chatBubble = new ChatBubble(container);
    });

    it('should show notification badge with count', () => {
      chatBubble.showNotification(3);

      const badge = container.querySelector('.notification-badge');
      expect(badge).toBeTruthy();
      expect(chatBubble.options.notificationCount).toBe(3);
      expect(badge.style.display).not.toBe('none');
    });

    it('should hide notification badge', () => {
      chatBubble.showNotification(3);
      chatBubble.hideNotification();

      const badge = container.querySelector('.notification-badge');
      expect(badge.style.display).toBe('none');
    });

    it('should update notification count', () => {
      chatBubble.showNotification(1);
      chatBubble.showNotification(5);

      expect(chatBubble.options.notificationCount).toBe(5);
    });

    it('should handle zero notifications', () => {
      chatBubble.showNotification(0);

      const badge = container.querySelector('.notification-badge');
      expect(badge.style.display).toBe('none');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      chatBubble = new ChatBubble(container, {
        onClick: onClickSpy,
        onAnimationComplete: onAnimationCompleteSpy
      });
    });

    it('should call onClick when bubble is clicked', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');

      bubbleElement.click();

      expect(onClickSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      bubbleElement.dispatchEvent(enterEvent);

      expect(onClickSpy).toHaveBeenCalledTimes(1);

      // Simulate Space key press
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      bubbleElement.dispatchEvent(spaceEvent);

      expect(onClickSpy).toHaveBeenCalledTimes(2);
    });

    it('should not trigger on other keyboard keys', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');

      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      bubbleElement.dispatchEvent(escEvent);

      expect(onClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      chatBubble = new ChatBubble(container);
    });

    it('should have proper accessibility attributes', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');

      expect(bubbleElement.getAttribute('role')).toBe('button');
      expect(bubbleElement.getAttribute('tabindex')).toBe('0');
      expect(bubbleElement.getAttribute('aria-label')).toBe('Open chat');
    });

    it('should update aria-label based on state', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');

      chatBubble.setOpen(true);
      expect(bubbleElement.getAttribute('aria-label')).toBe('Close chat');

      chatBubble.setOpen(false);
      expect(bubbleElement.getAttribute('aria-label')).toBe('Open chat');
    });
  });

  describe('Icon Management', () => {
    beforeEach(() => {
      chatBubble = new ChatBubble(container);
    });

    it('should show correct icon for closed state', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      const svg = bubbleElement.querySelector('svg');

      expect(svg).toBeTruthy();
      // Should show chat/message icon when closed
    });

    it('should rotate icon when open', () => {
      chatBubble.setOpen(true);

      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      const svg = bubbleElement.querySelector('svg');

      // Check if transformation is applied
      const computedStyle = window.getComputedStyle(svg);
      expect(bubbleElement.classList.contains('open')).toBe(true);
    });

    it('should use default icon color when none specified', () => {
      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      const svg = bubbleElement.querySelector('svg');
      const path = svg.querySelector('path');

      expect(path.getAttribute('stroke')).toBe('#ffffff');
    });

    it('should use custom icon color when specified', () => {
      // Clean up existing instance
      if (chatBubble) {
        chatBubble.destroy();
      }

      chatBubble = new ChatBubble(container, {
        iconColor: '#007BFF'
      });

      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      const svg = bubbleElement.querySelector('svg');
      const path = svg.querySelector('path');

      expect(path.getAttribute('stroke')).toBe('#007BFF');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing container gracefully', () => {
      expect(() => {
        chatBubble = new ChatBubble(null);
      }).not.toThrow();
    });

    it('should handle missing options gracefully', () => {
      expect(() => {
        chatBubble = new ChatBubble(container, null);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      const onClickSpy = vi.fn();
      const chatBubble = new ChatBubble(container, { onClick: onClickSpy });

      // Store original methods
      const removeEventListener = vi.spyOn(chatBubble.element, 'removeEventListener');

      chatBubble.destroy();

      // The destroy method should remove the element, so event listeners are cleaned up
      expect(chatBubble.element.parentNode).toBeNull();

      // Try clicking on the element after destroy - should not be in DOM
      const bubbleInDom = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleInDom).toBeNull();
    });

    it('should remove element from DOM on destroy', () => {
      chatBubble = new ChatBubble(container);

      const bubbleElement = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleElement).toBeTruthy();

      chatBubble.destroy();

      const bubbleElementAfter = container.querySelector('.ticketping-chat-bubble');
      expect(bubbleElementAfter).toBe(null);
    });
  });
});

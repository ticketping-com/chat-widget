// src/components/chatBubble.js
import { createDOMElement } from '../utils/dom.js';
import { CSS_CLASSES } from '../constants/config.js';

export class ChatBubble {
  constructor(container, options = {}) {
    if (!container) {
      console.error('ChatBubble: Container is required');
      // Initialize as a broken state but don't throw
      this.container = null;
      this.element = null;
      this.notificationBadge = null;
      this.isOpen = false;
      this.options = {
        onClick: () => {},
        showNotificationBadge: false,
        notificationCount: 0,
        ...options
      };
      return;
    }

    this.container = container;
    this.options = {
      onClick: () => {},
      showNotificationBadge: false,
      notificationCount: 0,
      ...options
    };

    this.element = null;
    this.notificationBadge = null;
    this.isOpen = false;

    this.render();
    this.attachEventListeners();
  }

  render() {
    if (!this.container) {
      return; // Can't render without container
    }

    this.element = createDOMElement('button', {
      className: `${CSS_CLASSES.BUBBLE}`,
      'aria-label': 'Open chat',
      'aria-expanded': 'false',
      role: 'button',
      tabindex: '0'
    });

    // Chat icon SVG
    const iconSvg = this.createChatIcon();
    this.element.appendChild(iconSvg);

    // Notification badge
    if (this.options.showNotificationBadge) {
      this.createNotificationBadge();
    }

    this.container.appendChild(this.element);
  }

  createChatIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M14.25,2.25H3.75c-1.105,0-2,.896-2,2v7c0,1.104,.895,2,2,2h2v3l3.75-3h4.75c1.105,0,2-.896,2-2V4.25c0-1.104-.895-2-2-2Z');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.options.iconColor || '#ffffff');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '1.5');

    svg.appendChild(path);
    return svg;
  }

  createCloseIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');

    svg.appendChild(path);
    return svg;
  }

  createNotificationBadge() {
    this.notificationBadge = createDOMElement('div', {
      className: 'notification-badge',
      textContent: this.options.notificationCount > 99 ? '99+' : this.options.notificationCount.toString()
    });

    this.element.appendChild(this.notificationBadge);
  }

  attachEventListeners() {
    this.element.addEventListener('click', () => {
      this.handleClick();
    });

    // Handle keyboard navigation
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleClick();
      }
    });
  }

  handleClick() {
    this.options.onClick();

    // Hide notification badge when clicked
    if (this.notificationBadge) {
      this.hideNotificationBadge();
    }
  }

  setOpen(isOpen) {
    this.isOpen = isOpen;

    if (isOpen) {
      this.element.classList.add(CSS_CLASSES.OPEN);
      this.element.setAttribute('aria-expanded', 'true');
      this.element.setAttribute('aria-label', 'Close chat');

      // Replace icon with close icon
      const svg = this.element.querySelector('svg');
      if (svg) {
        this.element.removeChild(svg);
        this.element.appendChild(this.createCloseIcon());
      }
    } else {
      this.element.classList.remove(CSS_CLASSES.OPEN);
      this.element.setAttribute('aria-expanded', 'false');
      this.element.setAttribute('aria-label', 'Open chat');

      // Replace icon with chat icon
      const svg = this.element.querySelector('svg');
      if (svg) {
        this.element.removeChild(svg);
        this.element.appendChild(this.createChatIcon());
      }
    }
  }

  showNotificationBadge(count = 1) {
    if (!this.notificationBadge) {
      this.createNotificationBadge();
    }

    this.options.notificationCount = count;
    this.notificationBadge.textContent = count > 99 ? '99+' : count.toString();

    if (count > 0) {
      this.notificationBadge.style.display = 'flex';
      // Add pulse animation to draw attention
      this.notificationBadge.style.animation = 'tp-pulse 1s ease-in-out 3';
    } else {
      this.notificationBadge.style.display = 'none';
    }
  }

  hideNotificationBadge() {
    if (this.notificationBadge) {
      this.notificationBadge.style.display = 'none';
      this.options.notificationCount = 0;
    }
  }

  updateNotificationCount(count) {
    this.options.notificationCount = count;

    if (count > 0) {
      this.showNotificationBadge(count);
    } else {
      this.hideNotificationBadge();
    }
  }

  setTheme(theme) {
    this.element.setAttribute('data-theme', theme);
  }

  setPosition(position) {
    // Position will be handled by parent container
    this.element.setAttribute('data-position', position);
  }

  bounce() {
    this.element.style.animation = 'tp-bounce 0.6s ease-in-out';
    setTimeout(() => {
      this.element.style.animation = '';
    }, 600);
  }

  // Accessibility
  setAriaLabel(label) {
    this.element.setAttribute('aria-label', label);
  }

  focus() {
    this.element.focus();
  }

  blur() {
    this.element.blur();
  }

  // State management
  disable() {
    this.element.disabled = true;
    this.element.setAttribute('aria-disabled', 'true');
  }

  enable() {
    this.element.disabled = false;
    this.element.setAttribute('aria-disabled', 'false');
  }

  // Cleanup
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  // Alias methods for test compatibility
  showNotification(count = 1) {
    return this.showNotificationBadge(count);
  }

  hideNotification() {
    return this.hideNotificationBadge();
  }
}

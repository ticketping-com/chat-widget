// src/components/chatBubble.js
import { createDOMElement } from '../utils/dom.js';
import { CSS_CLASSES } from '../constants/config.js';

export class ChatBubble {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onClick: () => {},
      onAnimationComplete: () => {},
      showPulse: true,
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
    this.element = createDOMElement('button', {
      className: `${CSS_CLASSES.BUBBLE} ${this.options.showPulse ? CSS_CLASSES.PULSE : ''}`,
      'aria-label': 'Open chat',
      'aria-expanded': 'false'
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
    svg.setAttribute('viewBox', '0 0 256 256');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '32');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M216,48H40A16,16,0,0,0,24,64V224a15.84,15.84,0,0,0,9.25,14.5A16.05,16.05,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM160,152H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z');

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

    // Remove pulse animation after timeout
    if (this.options.showPulse) {
      setTimeout(() => {
        this.removePulse();
        this.options.onAnimationComplete();
      }, 10000);
    }
  }

  handleClick() {
    this.options.onClick();
    this.removePulse();

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

  removePulse() {
    this.element.classList.remove(CSS_CLASSES.PULSE);
  }

  showNotificationBadge(count = 1) {
    if (!this.notificationBadge) {
      this.createNotificationBadge();
    }

    this.options.notificationCount = count;
    this.notificationBadge.textContent = count > 99 ? '99+' : count.toString();
    this.notificationBadge.style.display = 'flex';

    // Add pulse animation to draw attention
    this.notificationBadge.style.animation = 'tp-pulse 1s ease-in-out 3';
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

  // Animation methods
  pulse() {
    this.element.classList.add(CSS_CLASSES.PULSE);
  }

  stopPulse() {
    this.element.classList.remove(CSS_CLASSES.PULSE);
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
}

// src/components/chatBubble.js
import { createDOMElement } from '../utils/dom.js';
import { CSS_CLASSES } from '../constants/config.js';

export class ChatBubble {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onClick: () => {},
      onAnimationComplete: () => {},
      showPulseAnimation: true,
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
      className: `${CSS_CLASSES.BUBBLE} ${this.options.showPulseAnimation ? CSS_CLASSES.PULSE : ''}`,
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
    path.setAttribute('d', 'M146.476 232.21L152.258 222.442L138.489 214.291L132.706 224.061L146.476 232.21ZM103.742 222.442L109.524 232.21L123.293 224.061L117.511 214.291L103.742 222.442ZM132.706 224.061C130.651 227.534 125.349 227.534 123.293 224.061L109.524 232.21C117.776 246.151 138.224 246.151 146.476 232.21L132.706 224.061ZM112 29.3333H144V13.3333H112V29.3333ZM226.667 112V122.667H242.667V112H226.667ZM29.3335 122.667V112H13.3335V122.667H29.3335ZM13.3335 122.667C13.3335 134.982 13.3291 144.62 13.8595 152.393C14.3948 160.238 15.5013 166.767 18.0022 172.804L32.7843 166.682C31.2254 162.918 30.3021 158.334 29.8225 151.303C29.3379 144.202 29.3335 135.201 29.3335 122.667H13.3335ZM83.2268 194.577C69.8355 194.346 62.8186 193.494 57.3185 191.216L51.1956 205.998C59.7819 209.554 69.5615 210.343 82.9512 210.574L83.2268 194.577ZM18.0022 172.804C24.2272 187.832 36.1672 199.773 51.1956 205.998L57.3185 191.216C46.2105 186.614 37.3853 177.79 32.7843 166.682L18.0022 172.804ZM226.667 122.667C226.667 135.201 226.663 144.202 226.178 151.303C225.698 158.334 224.775 162.918 223.216 166.682L237.998 172.804C240.499 166.767 241.605 160.238 242.141 152.393C242.671 144.62 242.667 134.982 242.667 122.667H226.667ZM173.049 210.574C186.439 210.343 196.219 209.554 204.804 205.998L198.682 191.216C193.182 193.494 186.164 194.346 172.773 194.577L173.049 210.574ZM223.216 166.682C218.615 177.79 209.79 186.614 198.682 191.216L204.804 205.998C219.833 199.773 231.773 187.832 237.998 172.804L223.216 166.682ZM144 29.3333C161.613 29.3333 174.261 29.3417 184.127 30.2798C193.874 31.2065 200.076 32.9838 205.02 36.0136L213.38 22.3714C205.499 17.5421 196.559 15.3897 185.642 14.3517C174.843 13.3249 161.304 13.3333 144 13.3333V29.3333ZM242.667 112C242.667 94.6966 242.675 81.1573 241.648 70.3585C240.61 59.4406 238.458 50.5008 233.629 42.62L219.986 50.98C223.017 55.9244 224.794 62.1263 225.721 71.8729C226.658 81.7386 226.667 94.3867 226.667 112H242.667ZM205.02 36.0136C211.12 39.7517 216.249 44.8802 219.986 50.98L233.629 42.62C228.572 34.3673 221.633 27.4287 213.38 22.3714L205.02 36.0136ZM112 13.3333C94.6968 13.3333 81.1575 13.3249 70.3587 14.3517C59.4408 15.3897 50.501 17.5421 42.6202 22.3714L50.9802 36.0136C55.9245 32.9838 62.1265 31.2065 71.8731 30.2798C81.7388 29.3417 94.3869 29.3333 112 29.3333V13.3333ZM29.3335 112C29.3335 94.3867 29.3419 81.7386 30.28 71.8729C31.2067 62.1263 32.984 55.9244 36.0138 50.98L22.3716 42.62C17.5422 50.5008 15.3899 59.4406 14.3518 70.3585C13.3251 81.1573 13.3335 94.6966 13.3335 112H29.3335ZM42.6202 22.3714C34.3675 27.4287 27.4289 34.3673 22.3716 42.62L36.0138 50.98C39.7518 44.8802 44.8804 39.7517 50.9802 36.0136L42.6202 22.3714ZM117.511 214.291C115.345 210.632 113.444 207.404 111.596 204.867C109.648 202.196 107.416 199.791 104.319 197.989L96.2745 211.821C96.7802 212.114 97.4692 212.651 98.6652 214.291C99.9598 216.068 101.423 218.523 103.742 222.442L117.511 214.291ZM82.9512 210.574C87.6348 210.655 90.6014 210.715 92.8629 210.964C94.9761 211.199 95.7951 211.541 96.2745 211.821L104.319 197.989C101.196 196.173 97.9464 195.429 94.6238 195.061C91.4496 194.71 87.6135 194.653 83.2268 194.577L82.9512 210.574ZM152.258 222.442C154.577 218.523 156.04 216.068 157.335 214.291C158.53 212.651 159.219 212.114 159.725 211.821L151.681 197.989C148.585 199.791 146.351 202.196 144.404 204.867C142.556 207.404 140.655 210.632 138.489 214.291L152.258 222.442ZM172.773 194.577C168.386 194.653 164.551 194.71 161.376 195.061C158.053 195.429 154.804 196.173 151.681 197.989L159.725 211.821C160.205 211.541 161.024 211.199 163.137 210.964C165.399 210.715 168.365 210.655 173.049 210.574L172.773 194.577Z');

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
    if (this.options.showPulseAnimation) {
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

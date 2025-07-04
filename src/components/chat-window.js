import { createDOMElement } from '../utils/dom.js';
import { CSS_CLASSES } from '../constants/config.js';

export class ChatWindow {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onClose: () => {},
      onTabSwitch: () => {},
      onSendMessage: () => {},
      onFileUpload: () => {},
      onConversationSelect: () => {},
      ...options
    };

    this.element = null;
    this.activeTab = 'home';
    this.conversations = [];
    this.currentConversation = null;

    this.render();
    this.attachEventListeners();
  }

  render() {
    this.element = createDOMElement('div', {
      className: CSS_CLASSES.WINDOW
    });

    this.element.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-content">
          <h3>Ticketping</h3>
          <p>We're here to help!</p>
        </div>
        <button class="close-btn" aria-label="Close chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="chat-tabs">
        <button class="tab active" data-tab="home">Home</button>
        <button class="tab" data-tab="messages">Messages</button>
      </div>

      <div class="chat-content">
        <div class="tab-content active" id="homeTab">
          <div class="home-content">
            <h4>👋 Welcome!</h4>
            <p>Hi there! How can we help you today?</p>

            <button class="start-conversation-btn">
              Send us a message
            </button>

            <div class="help-articles">
              <h5>Popular articles</h5>
              <a href="#" class="help-article">
                <svg viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                Getting started guide
              </a>
              <a href="#" class="help-article">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                How to create tickets
              </a>
            </div>
          </div>
        </div>

        <div class="tab-content" id="messagesTab">
          <div class="messages-content">
            <div class="conversation-list" id="conversationList">
              <!-- Conversations will be populated here -->
            </div>

            <div class="active-conversation" id="activeConversation" style="display: none;">
              <div class="messages-list" id="messagesList">
                <!-- Messages will be populated here -->
              </div>

              <div class="typing-indicator" id="typingIndicator">
                Support is typing
                <div class="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <div class="message-input-container">
                <div class="message-input-wrapper">
                  <textarea
                    class="message-input"
                    placeholder="Type your message..."
                    rows="1"
                  ></textarea>
                  <div class="input-actions">
                    <input type="file" class="file-input" accept="image/*,.pdf,.doc,.docx">
                    <button class="file-btn">
                      <svg viewBox="0 0 24 24">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                    </button>
                    <button class="send-btn" disabled>
                      <svg viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="empty-state" id="emptyState">
              <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              <h4>No conversations yet</h4>
              <p>Start a conversation to get help from our support team.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);
  }

  attachEventListeners() {
    // Close button
    this.element.querySelector('.close-btn').addEventListener('click', () => {
      this.options.onClose();
    });

    // Tab switching
    this.element.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Start conversation button
    this.element.querySelector('.start-conversation-btn').addEventListener('click', () => {
      this.switchTab('messages');
      this.options.onConversationSelect('new');
    });

    // Message input handling
    const messageInput = this.element.querySelector('.message-input');
    const sendBtn = this.element.querySelector('.send-btn');

    messageInput.addEventListener('input', () => {
      this.handleInputChange(messageInput, sendBtn);
    });

    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(messageInput, sendBtn);
      }
    });

    sendBtn.addEventListener('click', () => {
      this.sendMessage(messageInput, sendBtn);
    });

    // File upload
    const fileBtn = this.element.querySelector('.file-btn');
    const fileInput = this.element.querySelector('.file-input');

    fileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => this.handleFileUpload(fileInput));
  }

  show() {
    this.element.classList.add(CSS_CLASSES.OPEN);
  }

  hide() {
    this.element.classList.remove(CSS_CLASSES.OPEN);
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update tab buttons
    this.element.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    this.element.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });

    this.options.onTabSwitch(tabName);
  }

  setConversations(conversations) {
    this.conversations = conversations;
    this.renderConversationList();
  }

  renderConversationList() {
    const listElement = this.element.querySelector('#conversationList');

    if (this.conversations.length === 0) {
      this.showEmptyState();
      return;
    }

    listElement.innerHTML = '';

    this.conversations.forEach(conversation => {
      const item = createDOMElement('div', {
        className: 'conversation-item',
        'data-conversation': conversation.id
      });

      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const snippet = lastMessage ? lastMessage.text.substring(0, 50) + '...' : 'No messages';

      item.innerHTML = `
        <div class="conversation-preview">${conversation.title || 'Support Conversation'}</div>
        <div class="conversation-time">${this.formatTime(conversation.updatedAt || conversation.createdAt)}</div>
        <div class="conversation-snippet">${snippet}</div>
      `;

      item.addEventListener('click', () => {
        this.options.onConversationSelect(conversation.id);
      });

      listElement.appendChild(item);
    });
  }

  showConversation(conversationId) {
    this.currentConversation = conversationId;
    this.element.querySelector('#conversationList').style.display = 'none';
    this.element.querySelector('#activeConversation').style.display = 'flex';
    this.element.querySelector('#emptyState').style.display = 'none';
  }

  showConversationList() {
    this.element.querySelector('#conversationList').style.display = 'block';
    this.element.querySelector('#activeConversation').style.display = 'none';
    this.element.querySelector('#emptyState').style.display = 'none';
  }

  showEmptyState() {
    this.element.querySelector('#conversationList').style.display = 'none';
    this.element.querySelector('#activeConversation').style.display = 'none';
    this.element.querySelector('#emptyState').style.display = 'flex';
  }

  addMessage(message) {
    const messagesList = this.element.querySelector('#messagesList');
    const messageElement = this.createMessageElement(message);
    messagesList.appendChild(messageElement);
    this.scrollToBottom();
  }

  setMessages(messages) {
    const messagesList = this.element.querySelector('#messagesList');
    messagesList.innerHTML = '';
    messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      messagesList.appendChild(messageElement);
    });
    this.scrollToBottom();
  }

  createMessageElement(message) {
    const element = createDOMElement('div', {
      className: `message ${message.type}`
    });

    element.innerHTML = `
      <div class="message-bubble">${this.escapeHtml(message.text)}</div>
      <div class="message-time">${message.time}</div>
    `;

    return element;
  }

  handleInputChange(input, sendBtn) {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    this.autoResizeTextarea(input);
  }

  sendMessage(input, sendBtn) {
    const text = input.value.trim();
    if (!text) return;

    this.options.onSendMessage({ text });
    input.value = '';
    sendBtn.disabled = true;
    this.autoResizeTextarea(input);
  }

  handleFileUpload(fileInput) {
    const file = fileInput.files[0];
    if (file) {
      this.options.onFileUpload(file);
      fileInput.value = '';
    }
  }

  showTypingIndicator(show = true) {
    const indicator = this.element.querySelector('#typingIndicator');
    indicator.classList.toggle('show', show);
    if (show) this.scrollToBottom();
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  scrollToBottom() {
    const messagesList = this.element.querySelector('#messagesList');
    setTimeout(() => {
      messagesList.scrollTop = messagesList.scrollHeight;
    }, 100);
  }

  formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateAgentStatus(status) {
    const headerSubtext = this.element.querySelector('.chat-header-content p');
    if (status === 'online') {
      headerSubtext.textContent = 'We\'re online and ready to help!';
    } else {
      headerSubtext.textContent = 'We\'ll get back to you soon!';
    }
  }

  showError(message) {
    // TODO: Implement error display
    console.error(message);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

// src/utils/events.js - Event handling utilities
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}
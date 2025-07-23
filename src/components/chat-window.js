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
      onBackButtonClick: () => {},
      ...options
    };

    this.element = null;
    this.activeTab = 'home';
    this.conversations = [];

    this.render();
    this.attachEventListeners();
  }

  render() {
    this.element = createDOMElement('div', {
      className: CSS_CLASSES.WINDOW
    });

    this.element.innerHTML = `
      <div class="ticketping-chat-content">
        <div class="ticketping-tab-content active" id="homeTab">
          <div class="ticketping-chat-header">
            <div class="ticketping-workspace-logo">
              <img src="https://spendcrypto.com/android-chrome-192x192.png" alt="logo">
            </div>
            <button class="ticketping-close-btn" aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="ticketping-home-container">
            <div class="ticketping-home-content">
              <h4>Hi there 👋</h4>
              <p>How can we help you?</p>
            </div>
            <div class="ticketping-actions-container">
              <button class="ticketping-start-conversation-btn">
                <div class="ticketping-start-conversation-btn-content">
                  <span class="ticketping-start-conversation-btn-text">Send us a message</span>
                  <span class="ticketping-start-conversation-btn-subtext">Typically respond within minutes</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M231.4,44.34s0,.1,0,.15l-58.2,191.94a15.88,15.88,0,0,1-14,11.51q-.69.06-1.38.06a15.86,15.86,0,0,1-14.42-9.15L107,164.15a4,4,0,0,1,.77-4.58l57.92-57.92a8,8,0,0,0-11.31-11.31L96.43,148.26a4,4,0,0,1-4.58.77L17.08,112.64a16,16,0,0,1,2.49-29.8l191.94-58.2.15,0A16,16,0,0,1,231.4,44.34Z"></path></svg>
              </button>
            </div>
          </div>
          <div class="ticketping-plug">
            <a href="https://ticketping.com" target="_blank" rel="noopener noreferrer">
              Powered by Ticketping
            </a>
          </div>
        </div>

        <div class="ticketping-tab-content" id="messagesTab">
          <div class="ticketping-messages-header">
            <button class="ticketping-back-btn" id="tpBackBtn" aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
            </button>
            <div class="ticketping-tab-heading">
              <span>Messages</span>
            </div>
            <button class="ticketping-close-btn-2" aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="ticketping-messages-content">
            <div class="ticketping-conversation-container">
              <div class="ticketping-conversation-list" id="conversationList">
                <!-- Conversations will be populated here -->
              </div>
              <div class="ticketping-send-a-message-container" id="sendMessageBtnContainer">
                <button class="ticketping-send-message-btn">
                  <span class="ticketping-send-message-btn-text">Send us a message</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M231.4,44.34s0,.1,0,.15l-58.2,191.94a15.88,15.88,0,0,1-14,11.51q-.69.06-1.38.06a15.86,15.86,0,0,1-14.42-9.15L107,164.15a4,4,0,0,1,.77-4.58l57.92-57.92a8,8,0,0,0-11.31-11.31L96.43,148.26a4,4,0,0,1-4.58.77L17.08,112.64a16,16,0,0,1,2.49-29.8l191.94-58.2.15,0A16,16,0,0,1,231.4,44.34Z"></path></svg>
                </button>
              </div>
            </div>

            <div class="active-conversation" id="activeConversation" style="display: none;">
              <div class="ticketping-messages-list" id="messagesList">
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

              <div class="ticketping-message-input-container">
                <div class="ticketping-message-input-wrapper">
                  <textarea
                    id="messageInput"
                    class="ticketping-message-input"
                    placeholder="Type your message..."
                    rows="1"
                  ></textarea>
                  <div class="ticketping-input-actions">
                    <div class="ticketping-file-input-container">
                      <input type="file" class="ticketping-file-input" accept="image/*,.pdf,.doc,.docx">
                      <button class="ticketping-file-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z"></path></svg>
                      </button>
                    </div>
                    <button class="ticketping-send-btn" disabled>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ticketping-chat-tabs" id="ticketpingChatTabs">
        <button class="ticketping-tab active" data-tab="home">
          <div class="tab-icon">
            <svg class="icon-inactive" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"></path></svg>
            <svg class="icon-active" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z"></path></svg>
          </div>

          <span>Home</span>
        </button>
        <button class="ticketping-tab" data-tab="messages">
          <div class="tab-icon">
            <svg class="icon-inactive" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.13,16.13,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM40,224h0ZM216,192H80a8,8,0,0,0-5.23,1.95L40,224V64H216ZM88,112a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,112Zm0,32a8,8,0,0,1,8-8h64a8,8,0,1,1,0,16H96A8,8,0,0,1,88,144Z"></path></svg>
            <svg class="icon-active" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.84,15.84,0,0,0,9.25,14.5A16.05,16.05,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78l.09-.07L83,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48ZM160,152H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Zm0-32H96a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16Z"></path></svg>
          </div>
          <span>Messages</span>
        </button>
      </div>
    `;

    this.container.appendChild(this.element);
  }

  attachEventListeners() {
    // Close button
    this.element.querySelector('.ticketping-close-btn').addEventListener('click', () => {
      this.options.onClose();
    });
    this.element.querySelector('.ticketping-close-btn-2').addEventListener('click', () => {
      this.options.onClose();
    });
    this.element.querySelector('#tpBackBtn').addEventListener('click', () => {
      this.showConversationList();
      this.options.onBackButtonClick();
    });

    // Tab switching
    this.element.querySelectorAll('.ticketping-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Start conversation button
    this.element.querySelector('.ticketping-start-conversation-btn').addEventListener('click', () => {
      this.switchTab('messages');
      this.options.onConversationSelect('new');
      // Delay focus to allow tab transition to complete
      setTimeout(() => {
        this.element.querySelector('#messageInput').focus();
      }, 50);
    });

    // Start conversation button
    this.element.querySelector('.ticketping-send-message-btn').addEventListener('click', () => {
      this.switchTab('messages');
      this.options.onConversationSelect('new');
      // Delay focus to allow tab transition to complete
      setTimeout(() => {
        this.element.querySelector('#messageInput').focus();
      }, 50);
    });

    // Message input handling
    const messageInput = this.element.querySelector('#messageInput');
    const sendBtn = this.element.querySelector('.ticketping-send-btn');

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
    const fileBtn = this.element.querySelector('.ticketping-file-btn');
    const fileInput = this.element.querySelector('.ticketping-file-input');

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
    this.element.querySelectorAll('.ticketping-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    this.element.querySelectorAll('.ticketping-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });

    if (tabName === 'messages') {
      this.element.querySelector('#conversationList').classList.add('show');
      this.element.querySelector('#sendMessageBtnContainer').classList.add('show');
    } else {
      this.element.querySelector('#conversationList').classList.remove('show');
      this.element.querySelector('#sendMessageBtnContainer').classList.remove('show');
    }
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

    // Sort conversations by latest first (modified or created timestamp)
    const sortedConversations = [...this.conversations].sort((a, b) => {
      const dateA = new Date(a.modified || a.created);
      const dateB = new Date(b.modified || b.created);
      return dateB - dateA; // Descending order (newest first)
    });

    sortedConversations.forEach(conversation => {
      const item = createDOMElement('div', {
        className: 'ticketping-conversation-item',
        'data-conversation': conversation.sessionId
      });

      const lastMessage = conversation['messages']?.[conversation['messages'].length - 1];
      const snippet = lastMessage ? lastMessage.messageText.substring(0, 50) + '...' : '';

      item.innerHTML = `
        <div class="ticketping-conversation-preview">${conversation.summary || snippet || 'Support Chat'}</div>
        <div class="ticketping-conversation-time">${this.formatDateTime(conversation.modified || conversation.created)}</div>
      `;

      item.addEventListener('click', () => {
        this.options.onConversationSelect(conversation.sessionId);
      });

      listElement.appendChild(item);
    });
  }

  showEmptyState() {
    const listElement = this.element.querySelector('#conversationList');
    listElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-content">
          <p>No conversations yet</p>
          <p class="empty-state-subtext">Send us a message to get help</p>
        </div>
      </div>
    `;
  }

  showConversationItem() {
    this.element.querySelector('#conversationList').classList.remove('show');
    this.element.querySelector('#activeConversation').style.display = 'flex';
    this.element.querySelector('#tpBackBtn').classList.add('show');
    this.element.querySelector('#sendMessageBtnContainer').classList.remove('show');
    this.element.querySelector('#ticketpingChatTabs').style.display = 'none';
    // Delay focus to allow DOM updates to complete
    setTimeout(() => {
      this.element.querySelector('#messageInput').focus();
    }, 50);
  }

  showConversationList() {
    this.element.querySelector('#conversationList').classList.add('show');
    this.element.querySelector('#activeConversation').style.display = 'none';
    this.element.querySelector('#tpBackBtn').classList.remove('show');
    this.element.querySelector('#sendMessageBtnContainer').classList.add('show');
    this.element.querySelector('#ticketpingChatTabs').style.display = 'flex';
    this.clearMessages();
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

  clearMessages() {
    const messagesList = this.element.querySelector('#messagesList');
    messagesList.innerHTML = '';
  }

  createMessageElement(message) {
    const element = createDOMElement('div', {
      className: `ticketping-message ${message.sender.toLowerCase()}`
    });

    element.innerHTML = `
      <div class="ticketping-message-bubble">${message.messageHtml ? message.messageHtml : this.escapeHtml(message.messageText)}</div>
      <div class="ticketping-message-time">${this.formatTime(message.created)}</div>
    `;

    return element;
  }

  handleInputChange(input, sendBtn) {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;

    // Animate file input container visibility when user starts typing
    this.toggleFileInputButton(!hasText);

    this.autoResizeTextarea(input);
  }

  sendMessage(input, sendBtn) {
    const text = input.value.trim();
    if (!text) {
      return;
    }

    this.options.onSendMessage({ text });
    input.value = '';
    sendBtn.disabled = true;
    this.toggleFileInputButton(true);
    this.autoResizeTextarea(input);
  }

  toggleFileInputButton(show) {
    const fileInputContainer = this.element.querySelector('.ticketping-file-input-container');
    if (fileInputContainer) {
      fileInputContainer.classList.toggle('hidden', !show);
    }
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
    if (show) {
      this.scrollToBottom();
    }
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
    return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  formatDateTime(date) {
    return new Date(date).toLocaleString([], { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateAgentStatus(status) {
    const headerSubtext = this.element.querySelector('.ticketping-chat-header-content p');
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
    if (!this.events[event]) {
      return;
    }
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.events[event]) {
      return;
    }
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

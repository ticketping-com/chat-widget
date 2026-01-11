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
      teamLogoIcon: null,
      teamSettings: null,
      ...options
    };

    this.element = null;
    this.activeTab = 'home';
    this.conversations = [];
    this.unreadConversations = new Set(); // Track which conversations have unread messages
    this.currentMessages = []; // Track messages for the active conversation
    this.isUploading = false; // Track file upload state

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
              ${this.getLogoHtml()}
            </div>
            <button class="ticketping-close-btn" aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="ticketping-home-container">
            <div class="ticketping-home-content">
              <h4>${this.getWelcomeTitle()}</h4>
              <p>${this.getWelcomeMessage()}</p>
            </div>
            <div class="ticketping-actions-container">
              <div class="ticketping-recent-conversation" id="recentConversationSection" style="display: none;">
                <div class="ticketping-recent-conversation-header">
                  <span class="ticketping-recent-conversation-title">Recent Conversation</span>
                </div>
                <div class="ticketping-recent-conversation-item" id="recentConversationItem">
                  <div class="ticketping-recent-conversation-preview"></div>
                  <div class="ticketping-recent-conversation-time"></div>
                </div>
              </div>
              <button class="ticketping-start-conversation-btn">
                <div class="ticketping-start-conversation-btn-content">
                  <span class="ticketping-start-conversation-btn-text">Send us a message</span>
                  <span class="ticketping-start-conversation-btn-subtext">${this.getResponseTimeText()}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 18 18"><path d="M16.345,1.654c-.344-.344-.845-.463-1.305-.315L2.117,5.493c-.491,.158-.831,.574-.887,1.087-.056,.512,.187,.992,.632,1.251l4.576,2.669,3.953-3.954c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061l-3.954,3.954,2.669,4.576c.235,.402,.65,.639,1.107,.639,.048,0,.097-.003,.146-.008,.512-.056,.929-.396,1.086-.886L16.661,2.96h0c.148-.463,.027-.963-.316-1.306Z" fill="currentColor" fill-opacity="0.6"></path></svg>
              </button>
            </div>
          </div>
          <div class="ticketping-plug">
            <a href="https://ticketping.com" target="_blank" rel="noopener noreferrer">
              <span>Powered by</span> <svg width="65.499" height="13" viewBox="0 0 65.499 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Ticketping" style="margin-top: 1px;"><path d="M35.072 9.717q-0.6 0 -0.96 -0.36 -0.347 -0.36 -0.347 -0.96V4.304h-1.813V3.144h1.813V0.971h1.374v2.173h1.96v1.16h-1.96V8.157q0 0.4 0.374 0.4h1.374V9.717zm-6.992 0.186q-1 0 -1.746 -0.413 -0.746 -0.427 -1.173 -1.186 -0.413 -0.773 -0.413 -1.786v-0.16q0 -1.026 0.413 -1.786 0.413 -0.773 1.147 -1.186 0.746 -0.427 1.72 -0.427 0.947 0 1.653 0.427 0.719 0.413 1.12 1.16t0.4 1.746v0.52h-5.054q0.027 0.867 0.573 1.387 0.56 0.506 1.387 0.506 0.773 0 1.16 -0.347 0.4 -0.347 0.613 -0.801l1.133 0.587q-0.186 0.374 -0.547 0.786 -0.347 0.413 -0.92 0.693t-1.467 0.281m-1.921 -4.148h3.64q-0.053 -0.746 -0.534 -1.16 -0.48 -0.427 -1.253 -0.427t-1.266 0.427q-0.48 0.413 -0.587 1.16M18.099 9.717V0.385h1.374v5.32h0.213l2.586 -2.56h1.826l-3.319 3.187 3.427 3.386H22.392l-2.707 -2.733h-0.213v2.733zm-4.837 0.186q-0.947 0 -1.72 -0.4 -0.759 -0.4 -1.213 -1.16 -0.44 -0.759 -0.44 -1.826v-0.173q0 -1.067 0.44 -1.813 0.453 -0.759 1.213 -1.16 0.773 -0.413 1.72 -0.413t1.613 0.347 1.067 0.92q0.413 0.573 0.534 1.266l-1.334 0.281q-0.067 -0.44 -0.281 -0.801t-0.6 -0.573 -0.973 -0.213q-0.573 0 -1.04 0.266 -0.453 0.253 -0.719 0.746 -0.266 0.48 -0.266 1.173v0.12q0 0.693 0.266 1.186t0.719 0.746q0.467 0.253 1.04 0.253 0.867 0 1.321 -0.44 0.453 -0.453 0.573 -1.147l1.334 0.307q-0.16 0.68 -0.573 1.253 -0.4 0.573 -1.067 0.92 -0.666 0.334 -1.613 0.334m-6.464 -0.186V3.144h1.374V9.717zm0.693 -7.466q-0.4 0 -0.68 -0.253 -0.266 -0.266 -0.266 -0.68T6.812 0.65q0.281 -0.266 0.68 -0.266 0.413 0 0.68 0.266 0.266 0.253 0.266 0.666t-0.266 0.68q-0.266 0.253 -0.68 0.253M3.158 9.719q-0.6 0 -0.96 -0.36 -0.347 -0.36 -0.347 -0.96v-4.095H0.038V3.144h1.813V0.971h1.374v2.173h1.96v1.16H3.225V8.157q0 0.4 0.374 0.4H4.972V9.717zm58.588 -6.721q0.768 0 1.356 0.312 0.6 0.3 0.936 0.756v-0.961h1.38v6.72q0 0.912 -0.385 1.621 -0.385 0.719 -1.116 1.128 -0.719 0.407 -1.728 0.407 -1.343 0 -2.232 -0.636 -0.888 -0.624 -1.009 -1.704h1.356q0.156 0.516 0.66 0.828 0.516 0.324 1.224 0.324 0.828 0 1.331 -0.504 0.516 -0.504 0.516 -1.465V8.72q-0.348 0.468 -0.948 0.792 -0.588 0.312 -1.343 0.312 -0.863 0 -1.584 -0.432 -0.707 -0.444 -1.128 -1.224 -0.407 -0.792 -0.407 -1.789t0.407 -1.764q0.42 -0.768 1.128 -1.187 0.719 -0.432 1.584 -0.432m2.292 3.408q0 -0.685 -0.288 -1.187 -0.276 -0.504 -0.732 -0.768t-0.984 -0.264 -0.984 0.264q-0.456 0.251 -0.744 0.756 -0.276 0.492 -0.276 1.175t0.276 1.2q0.288 0.516 0.744 0.792 0.468 0.264 0.984 0.264 0.529 0 0.984 -0.264t0.732 -0.768q0.288 -0.516 0.288 -1.2m-9.654 -3.406q0.78 0 1.392 0.324 0.624 0.324 0.972 0.96t0.348 1.536v3.9h-1.356V6.021q0 -0.888 -0.444 -1.356 -0.444 -0.48 -1.212 -0.48t-1.224 0.48q-0.444 0.468 -0.444 1.356V9.717h-1.368V3.105h1.368v0.756q0.336 -0.407 0.853 -0.636 0.529 -0.229 1.116 -0.229m-13.743 1.081q0.348 -0.456 0.948 -0.768t1.356 -0.312q0.863 0 1.572 0.432 0.719 0.42 1.128 1.187t0.407 1.764 -0.407 1.789q-0.407 0.78 -1.128 1.224 -0.707 0.432 -1.572 0.432 -0.756 0 -1.343 -0.3 -0.588 -0.312 -0.96 -0.768v4.104h-1.368V3.105h1.368zm4.02 2.304q0 -0.685 -0.288 -1.175 -0.276 -0.504 -0.744 -0.756 -0.456 -0.264 -0.984 -0.264 -0.516 0 -0.984 0.264 -0.456 0.264 -0.744 0.768 -0.276 0.504 -0.276 1.187t0.276 1.2q0.288 0.504 0.744 0.768 0.468 0.264 0.984 0.264 0.529 0 0.984 -0.264 0.468 -0.276 0.744 -0.792 0.288 -0.516 0.288 -1.2m2.981 3.337V3.144h1.374V9.717zm0.693 -7.467q-0.4 0 -0.68 -0.253 -0.266 -0.266 -0.266 -0.68t0.266 -0.666q0.281 -0.266 0.68 -0.266 0.413 0 0.68 0.266 0.266 0.253 0.266 0.666t-0.266 0.68q-0.266 0.253 -0.68 0.253" fill="currentColor"/></svg>
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
              <span class="ticketping-status-dot ${this.getAvailabilityStatusClass()}"></span>
            </div>
            <button class="ticketping-close-btn-2" aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div class="ticketping-messages-content">
            <div class="ticketping-conversation-container">
              <div class="ticketping-conversation-list ticketping-thin-scrollbar" id="conversationList">
                <!-- Conversations will be populated here -->
              </div>
              <div class="ticketping-send-a-message-container" id="sendMessageBtnContainer">
                <button class="ticketping-send-message-btn">
                  <span class="ticketping-send-message-btn-text">Send us a message</span>
                  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 18 18"><path d="M16.345,1.654c-.344-.344-.845-.463-1.305-.315L2.117,5.493c-.491,.158-.831,.574-.887,1.087-.056,.512,.187,.992,.632,1.251l4.576,2.669,3.953-3.954c.293-.293,.768-.293,1.061,0s.293,.768,0,1.061l-3.954,3.954,2.669,4.576c.235,.402,.65,.639,1.107,.639,.048,0,.097-.003,.146-.008,.512-.056,.929-.396,1.086-.886L16.661,2.96h0c.148-.463,.027-.963-.316-1.306Z" fill="currentColor"></path></svg>
                </button>
              </div>
            </div>

            <div class="active-conversation" id="activeConversation" style="display: none;">
              <div class="ticketping-loading-state" id="loadingState" style="display: none;">
                <div class="ticketping-loading-content">
                  <div class="ticketping-loading-spinner">
                    <div class="tp-loading-spinner-child"></div>
                  </div>
                  <div class="ticketping-loading-text">
                    <p>Starting conversation...</p>
                    <p class="ticketping-loading-subtext">Connecting you with support</p>
                  </div>
                </div>
              </div>

              <div class="ticketping-messages-list ticketping-thin-scrollbar" id="messagesList">
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

              <div class="ticketping-availability-bar" id="availabilityBar">
                ${this.getAvailabilityHtml()}
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
                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 18 18"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.5 1.75C14.5 1.33579 14.1642 1 13.75 1C13.3358 1 13 1.33579 13 1.75V3.5H11.25C10.8358 3.5 10.5 3.83579 10.5 4.25C10.5 4.66421 10.8358 5 11.25 5H13V6.75C13 7.16421 13.3358 7.5 13.75 7.5C14.1642 7.5 14.5 7.16421 14.5 6.75V5H16.25C16.6642 5 17 4.66421 17 4.25C17 3.83579 16.6642 3.5 16.25 3.5H14.5V1.75Z" fill="currentColor"></path>
<path fill-rule="evenodd" clip-rule="evenodd" d="M2 4.75C2 2.67879 3.67879 1 5.75 1C7.82121 1 9.5 2.67879 9.5 4.75V11.75C9.5 12.9922 8.49221 14 7.25 14C6.00779 14 5 12.9922 5 11.75V5C5 4.58579 5.33579 4.25 5.75 4.25C6.16421 4.25 6.5 4.58579 6.5 5V11.75C6.5 12.1638 6.83621 12.5 7.25 12.5C7.66379 12.5 8 12.1638 8 11.75V4.75C8 3.50721 6.99279 2.5 5.75 2.5C4.50721 2.5 3.5 3.50721 3.5 4.75V11.75C3.5 13.8208 5.17921 15.5 7.25 15.5C9.32079 15.5 11 13.8208 11 11.75V8.75C11 8.33579 11.3358 8 11.75 8C12.1642 8 12.5 8.33579 12.5 8.75V11.75C12.5 14.6492 10.1492 17 7.25 17C4.35079 17 2 14.6492 2 11.75V4.75Z" fill="currentColor" fill-opacity="0.4" data-color="color-2"></path></svg>
                      </button>
                    </div>
                    <button class="ticketping-send-btn" disabled>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"></path></svg>
                    </button>
                  </div>
                </div>
                <div class="ticketping-uploading-overlay" style="display: none;">
                  <div class="ticketping-uploading-content">
                    <div class="ticketping-spinner">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#e5e7eb" stroke-width="2"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6" stroke-width="2" stroke-linecap="round">
                          <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                    </div>
                    <span class="ticketping-uploading-text">Uploading...</span>
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
<svg class="icon-inactive" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 18 18"><path d="M14.855 5.95L9.605 1.96C9.247 1.688 8.752 1.688 8.395 1.96L3.145 5.95C2.896 6.139 2.75 6.434 2.75 6.747V14.251C2.75 15.356 3.645 16.251 4.75 16.251H7.25V12.251C7.25 11.699 7.698 11.251 8.25 11.251H9.75C10.302 11.251 10.75 11.699 10.75 12.251V16.251H13.25C14.355 16.251 15.25 15.356 15.25 14.251V6.746C15.25 6.433 15.104 6.14 14.855 5.95Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>
            <svg class="icon-active" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 18 18"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.0591 1.36312C9.4333 0.886573 8.56694 0.887449 7.94127 1.36281L2.69155 5.3526C2.2559 5.68346 2 6.19867 2 6.746V14.25C2 15.7692 3.23079 17 4.75 17H13.25C14.7692 17 16 15.7692 16 14.25V6.746C16 6.20008 15.7448 5.68398 15.3088 5.35288L10.0591 1.36312Z" fill="currentColor" fill-opacity="0.4" data-color="color-2"></path>
<path d="M11.5 13.5V17H6.5V13.5C6.5 12.1193 7.61929 11 9 11C10.3807 11 11.5 12.1193 11.5 13.5Z" fill="currentColor"></path></svg>
          </div>
          <span>Home</span>
        </button>
        <button class="ticketping-tab" data-tab="messages">
          <div class="tab-icon">
            <div class="ticketping-tab-unread-dot" id="messagesTabUnreadDot" style="display: none;"></div>
<svg class="icon-inactive" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 18 18"><path d="M14.25,2.25H3.75c-1.105,0-2,.896-2,2v7c0,1.104,.895,2,2,2h2v3l3.75-3h4.75c1.105,0,2-.896,2-2V4.25c0-1.104-.895-2-2-2Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><line x1="5" y1="6.25" x2="13" y2="6.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" data-color="color-2"></line><line x1="5" y1="9.25" x2="10.25" y2="9.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" data-color="color-2"></line></svg>
            <svg class="icon-active" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24px" height="24px" viewBox="0 0 18 18"><path d="M3.75 1.5C2.23054 1.5 1 2.73203 1 4.25V11.25C1 12.768 2.23054 14 3.75 14H5V16.25C5 16.5383 5.16526 16.8011 5.42511 16.926C5.68496 17.0509 5.99339 17.0158 6.21852 16.8357L9.76309 14H14.25C15.7695 14 17 12.768 17 11.25V4.25C17 2.73203 15.7695 1.5 14.25 1.5H3.75Z" fill="currentColor" fill-opacity="0.4" data-color="color-2"></path>
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.25 6.25C4.25 5.83579 4.58579 5.5 5 5.5H13C13.4142 5.5 13.75 5.83579 13.75 6.25C13.75 6.66421 13.4142 7 13 7H5C4.58579 7 4.25 6.66421 4.25 6.25Z" fill="currentColor"></path>
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.25 9.25C4.25 8.83579 4.58579 8.5 5 8.5H10.25C10.6642 8.5 11 8.83579 11 9.25C11 9.66421 10.6642 10 10.25 10H5C4.58579 10 4.25 9.66421 4.25 9.25Z" fill="currentColor"></path></svg>

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

    // Start conversation buttons (both in home and messages tabs)
    this.element.querySelector('.ticketping-start-conversation-btn').addEventListener('click', () => {
      this.options.onConversationSelect('new');
      // Delay focus to allow tab transition to complete
      setTimeout(() => {
        this.element.querySelector('#messageInput').focus();
      }, 50);
    });

    this.element.querySelector('.ticketping-send-message-btn').addEventListener('click', () => {
      this.options.onConversationSelect('new');
      // Delay focus to allow tab transition to complete
      setTimeout(() => {
        this.element.querySelector('#messageInput').focus();
      }, 50);
    });

    // Recent conversation click handler
    const recentConversationItem = this.element.querySelector('#recentConversationItem');
    if (recentConversationItem) {
      recentConversationItem.addEventListener('click', () => {
        const sessionId = recentConversationItem.dataset.conversationId;
        if (sessionId) {
          this.options.onConversationSelect(sessionId);
        }
      });
    }

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

  setConversations(conversations, unreadConversations = new Set()) {
    this.conversations = conversations;
    this.unreadConversations = unreadConversations instanceof Set
      ? unreadConversations
      : new Set(unreadConversations);
    this.renderConversationList();
    this.updateRecentConversation();
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
      const isUnread = this.unreadConversations.has(conversation.sessionId);
      const item = createDOMElement('div', {
        className: `ticketping-conversation-item${isUnread ? ' unread' : ''}`,
        'data-conversation': conversation.sessionId
      });

      const lastMessage = conversation['messages']?.[conversation['messages'].length - 1];
      const snippet = lastMessage ? lastMessage.messageText.substring(0, 50) + '...' : '';

      item.innerHTML = `
        ${isUnread ? '<div class="ticketping-unread-dot"></div>' : ''}
        <div class="ticketping-conversation-preview${isUnread ? ' unread' : ''}">${conversation.summary || snippet || 'Support Chat'}</div>
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
    // Hide loading state if visible
    this.hideLoadingState();
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
    this.hideLoadingState();
  }

  showLoadingState() {
    this.element.querySelector('#conversationList').classList.remove('show');
    this.element.querySelector('#activeConversation').style.display = 'flex';
    this.element.querySelector('#loadingState').style.display = 'flex';
    this.element.querySelector('#messagesList').style.display = 'none';
    this.element.querySelector('#typingIndicator').style.display = 'none';
    this.element.querySelector('.ticketping-message-input-container').style.display = 'none';
    this.element.querySelector('#tpBackBtn').classList.add('show');
    this.element.querySelector('#sendMessageBtnContainer').classList.remove('show');
    this.element.querySelector('#ticketpingChatTabs').style.display = 'none';
  }

  hideLoadingState() {
    this.element.querySelector('#loadingState').style.display = 'none';
    this.element.querySelector('#messagesList').style.display = 'block';
    this.element.querySelector('#typingIndicator').style.display = 'none';
    this.element.querySelector('.ticketping-message-input-container').style.display = 'block';
  }

  addMessage(message) {
    const messagesList = this.element.querySelector('#messagesList');
    const previousMessage = this.currentMessages[this.currentMessages.length - 1];
    // Add message to current state
    this.currentMessages.push(message);

    // Process the new message for grouping and timestamp display
    const processedMessage = this.processNewMessageForGrouping(message, previousMessage);

    // If we need to update the previous message (remove timestamp due to grouping)
    if (processedMessage.updatePrevious && previousMessage) {
      const previousMessageElements = messagesList.querySelectorAll('.ticketping-message');
      const lastPreviousElement = previousMessageElements[previousMessageElements.length - 1];
      if (lastPreviousElement) {
        this.updateMessageElementForGrouping(lastPreviousElement, previousMessage, false);
      }
    }

    // Add date separator if needed
    if (processedMessage.showDateSeparator) {
      const dateSeparator = this.createDateSeparatorElement(processedMessage.created);
      messagesList.appendChild(dateSeparator);
    }

    // Create and append the new message element
    const messageElement = this.createMessageElement(processedMessage);
    messagesList.appendChild(messageElement);

    this.scrollToBottom();
  }

  setMessages(messages) {
    const messagesList = this.element.querySelector('#messagesList');
    messagesList.innerHTML = '';

    // Update current messages state
    this.currentMessages = [...messages];

    // Process messages to determine which ones should show timestamps
    const processedMessages = this.processMessagesForGrouping(messages);

    processedMessages.forEach(message => {
      // Add date separator if needed
      if (message.showDateSeparator) {
        const dateSeparator = this.createDateSeparatorElement(message.created);
        messagesList.appendChild(dateSeparator);
      }

      const messageElement = this.createMessageElement(message);
      messagesList.appendChild(messageElement);
    });
    this.scrollToBottom();
  }

  clearMessages() {
    const messagesList = this.element.querySelector('#messagesList');
    messagesList.innerHTML = '';
    this.currentMessages = [];
  }

  createMessageElement(message) {
    // Build CSS classes
    let cssClasses = `ticketping-message ${message.sender.toLowerCase()}`;

    if (message.isGrouped) {
      cssClasses += ' grouped';
    }

    if (message.isFirstInGroup) {
      cssClasses += ' first-in-group';
    }

    if (message.isLastInGroup) {
      cssClasses += ' last-in-group';
    }

    const element = createDOMElement('div', {
      className: cssClasses
    });

    // Check if message has file attachment
    const hasAttachment = message.filename && message.filepath;

    // Determine if timestamp should be shown (default to true for backward compatibility)
    const showTimestamp = message.showTimestamp !== false;

    if (hasAttachment) {
      const messageContent = message.messageHtml ? message.messageHtml : this.escapeHtml(message.messageText || '');
      const attachmentHtml = this.createAttachmentHtml(message.filename, message.filepath);

      element.innerHTML = `
        <div class="ticketping-message-bubble">
          ${messageContent}
          ${attachmentHtml}
        </div>
        ${showTimestamp ? `<div class="ticketping-message-time">${this.formatTime(message.created)}</div>` : ''}
      `;
    } else {
      element.innerHTML = `
        <div class="ticketping-message-bubble">${message.messageHtml ? message.messageHtml : this.escapeHtml(message.messageText)}</div>
        ${showTimestamp ? `<div class="ticketping-message-time">${this.formatTime(message.created)}</div>` : ''}
      `;
    }

    return element;
  }

  createDateSeparatorElement(date) {
    const element = createDOMElement('div', {
      className: 'ticketping-date-separator'
    });

    element.innerHTML = `
      <div class="ticketping-date-separator-line"></div>
      <div class="ticketping-date-separator-text">${this.formatDateSeparator(date)}</div>
      <div class="ticketping-date-separator-line"></div>
    `;

    return element;
  }

  processMessagesForGrouping(messages) {
    if (!messages || messages.length === 0) {
      return messages;
    }

    if (messages.length === 1) {
      return [{ ...messages[0], showTimestamp: true }];
    }

    // Time threshold for grouping messages (5 minutes in milliseconds)
    const TIME_THRESHOLD = 5 * 60 * 1000;

    // Initialize all messages with showTimestamp: false and track date changes
    const processedMessages = messages.map(message => ({ ...message, showTimestamp: false, showDateSeparator: false }));

    // Single pass: identify date changes and message groups simultaneously
    const groups = [];
    let currentGroup = { start: 0, end: 0, sender: processedMessages[0].sender };

    for (let i = 1; i < processedMessages.length; i++) {
      const current = processedMessages[i];
      const previous = processedMessages[i - 1];

      // Check for date changes using user's timezone
      const currentDate = this.getDateInUserTimezone(current.created);
      const previousDate = this.getDateInUserTimezone(previous.created);
      if (currentDate !== previousDate) {
        processedMessages[i].showDateSeparator = true;
      }

      // Check for message grouping
      const currentTime = new Date(current.created).getTime();
      const previousTime = new Date(previous.created).getTime();
      const timeGap = currentTime - previousTime;

      const senderChanged = current.sender !== previous.sender;
      const timeGapTooLarge = timeGap > TIME_THRESHOLD;

      // If sender changed OR time gap is too large, end current group and start new one
      if (senderChanged || timeGapTooLarge) {
        currentGroup.end = i - 1;
        groups.push(currentGroup);
        currentGroup = { start: i, end: i, sender: current.sender };
      } else {
        // Extend current group
        currentGroup.end = i;
      }
    }

    // Add the last group
    groups.push(currentGroup);

    // Second pass: apply timestamp visibility rules and CSS classes
    groups.forEach((group) => {
      // Always show timestamp for the last message in each group
      processedMessages[group.end].showTimestamp = true;

      // For single-message groups (isolated messages), always show timestamp
      if (group.start === group.end) {
        processedMessages[group.start].showTimestamp = true;
        // Single messages don't get grouped classes
      } else {
        // Multi-message group: add grouped classes
        for (let i = group.start; i <= group.end; i++) {
          processedMessages[i].isGrouped = true;
          processedMessages[i].isFirstInGroup = (i === group.start);
          processedMessages[i].isLastInGroup = (i === group.end);
        }
      }
    });

    // Always show timestamp for the very first message
    processedMessages[0].showTimestamp = true;

    return processedMessages;
  }

  processNewMessageForGrouping(newMessage, previousMessage) {
    // Time threshold for grouping messages (5 minutes in milliseconds)
    const TIME_THRESHOLD = 5 * 60 * 1000;
    // Initialize the processed message
    const processedMessage = {
      ...newMessage,
      showTimestamp: true, // Default to showing timestamp
      showDateSeparator: false,
      isGrouped: false,
      isFirstInGroup: false,
      isLastInGroup: false,
      updatePrevious: false
    };

    // If this is the first message, always show timestamp and no grouping
    if (!previousMessage) {
      return processedMessage;
    }

    // Check for date changes using user's timezone
    const currentDate = this.getDateInUserTimezone(newMessage.created);
    const previousDate = this.getDateInUserTimezone(previousMessage.created);
    if (currentDate !== previousDate) {
      processedMessage.showDateSeparator = true;
    }

    // Check for message grouping conditions
    const currentTime = new Date(newMessage.created).getTime();
    const previousTime = new Date(previousMessage.created).getTime();
    const timeGap = currentTime - previousTime;

    const senderChanged = newMessage.sender !== previousMessage.sender;
    const timeGapTooLarge = timeGap > TIME_THRESHOLD;

    // If messages can be grouped (same sender and within time threshold)
    if (!senderChanged && !timeGapTooLarge) {
      // This message becomes part of a group
      processedMessage.isGrouped = true;
      processedMessage.isLastInGroup = true;
      processedMessage.showTimestamp = true; // Last in group shows timestamp
      // Previous message should be updated to not show timestamp and be part of group
      processedMessage.updatePrevious = true;
    }

    return processedMessage;
  }

  updateMessageElementForGrouping(messageElement, message, showTimestamp) {
    // Update CSS classes for grouping
    messageElement.classList.add('grouped');
    messageElement.classList.remove('last-in-group');
    // Update timestamp visibility
    const timeElement = messageElement.querySelector('.ticketping-message-time');
    if (timeElement) {
      timeElement.style.display = showTimestamp ? 'block' : 'none';
    }
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
      fileInputContainer.classList.toggle('tp-hidden', !show);
    }
  }

  async handleFileUpload(fileInput) {
    const file = fileInput.files[0];
    if (file) {
      this.setUploadingState(true);
      await this.options.onFileUpload(file);
      fileInput.value = '';
      this.finishFileUpload();
    }
  }

  setUploadingState(isUploading) {
    this.isUploading = isUploading;
    const uploadingOverlay = this.element.querySelector('.ticketping-uploading-overlay');

    if (isUploading) {
      // Show uploading overlay (blocks all interactions)
      uploadingOverlay.style.display = 'flex';
    } else {
      // Hide uploading overlay (re-enables all interactions)
      uploadingOverlay.style.display = 'none';
    }
  }

  finishFileUpload() {
    this.setUploadingState(false);
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

  getDateInUserTimezone(date) {
    return new Date(date).toLocaleDateString();
  }

  formatDateSeparator(date) {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Compare dates in user's timezone
    const messageDateStr = this.getDateInUserTimezone(date);
    const todayStr = this.getDateInUserTimezone(today);
    const yesterdayStr = this.getDateInUserTimezone(yesterday);

    if (messageDateStr === todayStr) {
      return 'Today';
    } else if (messageDateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getLogoHtml() {
    const teamLogoIcon = this.options.teamLogoIcon;

    if (teamLogoIcon) {
      return `<img src="${teamLogoIcon}" alt="logo">`;
    }

    // Default chat icon SVG
    return '<svg width="40" height="40" viewBox="0 0 1.2 1.2" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.1 0.25a0.15 0.15 0 1 1 -0.3 0 0.15 0.15 0 0 1 0.3 0" fill="#4CB782"/><path opacity=".5" d="M0.762 0.127A0.5 0.5 0 0 0 0.6 0.1C0.324 0.1 0.1 0.324 0.1 0.6c0 0.08 0.019 0.156 0.052 0.223 0.009 0.018 0.012 0.038 0.007 0.057l-0.03 0.111a0.065 0.065 0 0 0 0.08 0.08l0.111 -0.03a0.082 0.082 0 0 1 0.057 0.007A0.498 0.498 0 0 0 0.6 1.1c0.276 0 0.5 -0.224 0.5 -0.5 0 -0.057 -0.009 -0.111 -0.027 -0.162a0.225 0.225 0 0 1 -0.312 -0.312" fill="#1C274C"/></svg>';
  }

  getWelcomeTitle() {
    return 'Hi there 👋';
  }

  getWelcomeMessage() {
    const teamSettings = this.options.teamSettings;
    // Use widgetWelcomeMessage if available, otherwise fallback
    if (teamSettings?.widgetWelcomeMessage) {
      return this.escapeHtml(teamSettings.widgetWelcomeMessage);
    }
    return 'How can we help you?';
  }

  getAvailabilityHtml() {
    const teamSettings = this.options.teamSettings;

    if (!teamSettings) {
      return '';
    }

    const { isAvailable, nextAvailable, workHoursDisplay } = teamSettings;

    // If available, don't show anything (status dot in header is enough)
    if (isAvailable) {
      return '';
    }

    const moonIcon = '<svg class="ticketping-availability-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.54419 1.47446C8.70875 1.73227 8.70028 2.06417 8.52278 2.31324C7.88003 3.21522 7.5 4.31129 7.5 5.49999C7.5 8.53778 9.96222 11 13 11C14.0509 11 15.029 10.7009 15.8667 10.1868C16.1275 10.0267 16.4594 10.0412 16.7053 10.2233C16.9513 10.4054 17.0619 10.7186 16.9848 11.0148C16.0904 14.4535 12.9735 17 9.25 17C4.83179 17 1.25 13.4182 1.25 8.99999C1.25 5.08453 4.06262 1.83365 7.77437 1.14073C8.07502 1.0846 8.37963 1.21666 8.54419 1.47446Z" fill="currentColor"></path></svg>';

    const subtitle = '<div class="ticketping-availability-subtitle">Leave a message and we\'ll pick it up first thing.</div>';

    // If not available, show when they're next available
    if (nextAvailable) {
      return `
        <div class="ticketping-availability ticketping-availability--offline">
          ${moonIcon}
          <div class="ticketping-availability-content">
            <div class="ticketping-availability-title">Offline right now — back ${nextAvailable.dayName} at ${nextAvailable.timeFormatted} ${nextAvailable.timezoneAbbr}</div>
            ${subtitle}
          </div>
        </div>
      `;
    }

    // Fallback: show working hours if available
    if (workHoursDisplay?.full) {
      return `
        <div class="ticketping-availability ticketping-availability--offline">
          ${moonIcon}
          <div class="ticketping-availability-content">
            <div class="ticketping-availability-title">Offline right now — Hours: ${this.escapeHtml(workHoursDisplay.full)}</div>
            ${subtitle}
          </div>
        </div>
      `;
    }

    // Generic offline message
    return `
      <div class="ticketping-availability ticketping-availability--offline">
        ${moonIcon}
        <div class="ticketping-availability-content">
          <div class="ticketping-availability-title">Offline right now</div>
          ${subtitle}
        </div>
      </div>
    `;
  }

  getAvailabilityStatusClass() {
    const teamSettings = this.options.teamSettings;
    if (!teamSettings) {
      return 'online'; // Default to online if no settings
    }
    return teamSettings.isAvailable ? 'online' : 'offline';
  }

  getResponseTimeText() {
    const teamSettings = this.options.teamSettings;

    if (!teamSettings) {
      return 'Typically replies within minutes';
    }

    if (teamSettings.isAvailable) {
      return 'Typically replies within minutes';
    }

    // Show next available time when offline
    if (teamSettings.nextAvailable) {
      return `We'll respond on ${teamSettings.nextAvailable.dayName} at ${teamSettings.nextAvailable.timeFormatted}`;
    }

    return 'Typically replies within minutes';
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  }

  createAttachmentHtml(filename, filepath) {
    const escapedFilename = this.escapeHtml(filename);
    const isImage = this.isImageFile(filename);

    if (isImage) {
      return `
        <div class="ticketping-message-attachment">
          <div class="ticketping-attachment-image">
            <a href="${filepath}" target="_blank" rel="noopener noreferrer">
              <div class="ticketping-image-container">
                <div class="ticketping-image-placeholder"></div>
                <img src="${filepath}" alt="${escapedFilename}" class="ticketping-attachment-img" onload="this.parentElement.classList.add('loaded')" onerror="this.parentElement.classList.add('error')" />
              </div>
            </a>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="ticketping-message-attachment">
          <div class="ticketping-attachment-info">
            <div class="ticketping-attachment-name">
              <a href="${filepath}" target="_blank" rel="noopener noreferrer" style="color: #3B82F6; text-decoration: underline;">
                ${escapedFilename}
              </a>
            </div>
          </div>
        </div>
      `;
    }
  }

  updateAgentStatus(status) {
    const headerSubtext = this.element.querySelector('.ticketping-chat-header-content p');
    if (status === 'online') {
      headerSubtext.textContent = 'We\'re online and ready to help!';
    } else {
      headerSubtext.textContent = 'We\'ll get back to you soon!';
    }
  }

  updateRecentConversation() {
    const recentConversationSection = this.element.querySelector('#recentConversationSection');
    const recentConversationItem = this.element.querySelector('#recentConversationItem');

    if (!recentConversationSection || !recentConversationItem) {
      return;
    }

    // Get the most recent conversation
    if (this.conversations.length === 0) {
      recentConversationSection.style.display = 'none';
      return;
    }

    // Sort conversations by latest first (modified or created timestamp)
    const sortedConversations = [...this.conversations].sort((a, b) => {
      const dateA = new Date(a.modified || a.created);
      const dateB = new Date(b.modified || b.created);
      return dateB - dateA; // Descending order (newest first)
    });

    const recentConversation = sortedConversations[0];
    const isUnread = this.unreadConversations.has(recentConversation.sessionId);
    const lastMessage = recentConversation['messages']?.[recentConversation['messages'].length - 1];
    const snippet = lastMessage ? lastMessage.messageText.substring(0, 60) + '...' : '';
    const preview = recentConversation.summary || snippet || 'Support Chat';

    // Update the recent conversation item
    const previewElement = recentConversationItem.querySelector('.ticketping-recent-conversation-preview');
    previewElement.textContent = preview;

    // Handle unread state
    if (isUnread) {
      recentConversationItem.classList.add('unread');
      previewElement.classList.add('unread');
      // Add unread dot if not present
      if (!recentConversationItem.querySelector('.ticketping-unread-dot')) {
        const dot = createDOMElement('div', { className: 'ticketping-unread-dot' });
        recentConversationItem.insertBefore(dot, recentConversationItem.firstChild);
      }
    } else {
      recentConversationItem.classList.remove('unread');
      previewElement.classList.remove('unread');
      // Remove unread dot if present
      const existingDot = recentConversationItem.querySelector('.ticketping-unread-dot');
      if (existingDot) {
        existingDot.remove();
      }
    }

    recentConversationItem.querySelector('.ticketping-recent-conversation-time').textContent =
      this.formatDateTime(recentConversation.modified || recentConversation.created);
    recentConversationItem.dataset.conversationId = recentConversation.sessionId;

    // Show the recent conversation section
    recentConversationSection.style.display = 'block';
  }

  /**
   * Show or hide the unread dot on the Messages tab
   */
  setMessagesTabUnread(hasUnread) {
    const dot = this.element.querySelector('#messagesTabUnreadDot');
    if (dot) {
      dot.style.display = hasUnread ? 'block' : 'none';
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

<script>
  import TicketpingChat from './TicketpingChat.svelte';

  // Widget state
  let chatWidget = $state();
  let isWidgetOpen = $state(false);
  let widgetReady = $state(false);

  // User data for identification
  let currentUser = $state(null);
  let userName = $state('John Doe');
  let userEmail = $state('john@example.com');
  let userCompany = $state('Acme Corp');

  // Widget configuration
  const config = {
    appId: 'your-app-id',
    teamSlug: 'your-team-slug',
    apiBase: 'https://api.ticketping.com',
    wsBase: 'wss://api.ticketping.com',
    debug: true,
    showPulseAnimation: true,
    analytics: true,
    // Custom theme
    theme: {
      primaryColor: '#667eea',
      primaryButtonBg: '#667eea',
      primaryButtonText: '#ffffff',
      primaryHover: '#5a6fd8',
      textPrimary: '#2d3748',
      textSecondary: '#4a5568',
      background: '#ffffff',
      backgroundSecondary: '#f7fafc',
      border: '#e2e8f0',
      borderLight: '#edf2f7'
    }
  };

  // Event logs for demonstration
  let eventLogs = $state([]);

  function addLog(event, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    eventLogs = [
      {
        time: timestamp,
        event,
        data: data ? JSON.stringify(data, null, 2) : null
      },
      ...eventLogs.slice(0, 9) // Keep last 10 logs
    ];
  }

  // Event handlers
  function handleReady() {
    widgetReady = true;
    addLog('Widget Ready');
  }

  function handleOpen() {
    isWidgetOpen = true;
    addLog('Widget Opened');
  }

  function handleClose() {
    isWidgetOpen = false;
    addLog('Widget Closed');
  }

  function handleMessageSent(message) {
    addLog('Message Sent', message);
  }

  function handleMessageReceived(message) {
    addLog('Message Received', message);
  }

  function handleConversationStarted(id) {
    addLog('Conversation Started', { id });
  }

  function handleError(error) {
    addLog('Error', error);
    console.error('Widget error:', error);
  }

  // Control functions
  function openWidget() {
    if (chatWidget) {
      chatWidget.openWidget();
    }
  }

  function closeWidget() {
    if (chatWidget) {
      chatWidget.closeWidget();
    }
  }

  function toggleWidget() {
    if (chatWidget) {
      chatWidget.toggleWidget();
    }
  }

  function startConversation() {
    if (chatWidget && widgetReady) {
      const conversationId = chatWidget.startConversation();
      addLog('Start Conversation Called', { conversationId });
    }
  }

  function identifyUser() {
    if (userName && userEmail) {
      currentUser = {
        id: Date.now().toString(),
        name: userName,
        email: userEmail,
        company: userCompany,
        // In a real app, you'd get this from your auth system
        userJWT: 'your-actual-jwt-token-here'
      };
      addLog('User Identified', currentUser);
    }
  }

  function clearUser() {
    currentUser = null;
    userName = '';
    userEmail = '';
    userCompany = '';
    addLog('User Cleared');
  }

  function clearLogs() {
    eventLogs = [];
  }
</script>

<main>
  <div class="container">
    <header>
      <h1>🎯 Ticketping Chat Widget - Svelte Example</h1>
      <p>This example shows how to integrate the Ticketping Chat Widget in a Svelte application.</p>
    </header>

    <div class="status-section">
      <h2>Widget Status</h2>
      <div class="status {widgetReady ? 'ready' : 'loading'}">
        {widgetReady ? '✅ Widget Ready' : '⏳ Loading...'}
      </div>
      <div class="status {isWidgetOpen ? 'open' : 'closed'}">
        {isWidgetOpen ? '💬 Widget Open' : '💤 Widget Closed'}
      </div>
    </div>

    <div class="controls-section">
      <h2>Widget Controls</h2>
      <div class="button-group">
        <button on:click={openWidget} disabled={!widgetReady}>
          Open Widget
        </button>
        <button on:click={closeWidget} disabled={!widgetReady}>
          Close Widget
        </button>
        <button on:click={toggleWidget} disabled={!widgetReady}>
          Toggle Widget
        </button>
        <button on:click={startConversation} disabled={!widgetReady}>
          Start Conversation
        </button>
      </div>
    </div>

    <div class="user-section">
      <h2>User Management</h2>
      <div class="form-group">
        <label for="name">Name:</label>
        <input
          id="name"
          type="text"
          bind:value={userName}
          placeholder="Enter your name"
        />
      </div>
      <div class="form-group">
        <label for="email">Email:</label>
        <input
          id="email"
          type="email"
          bind:value={userEmail}
          placeholder="Enter your email"
        />
      </div>
      <div class="form-group">
        <label for="company">Company:</label>
        <input
          id="company"
          type="text"
          bind:value={userCompany}
          placeholder="Enter your company"
        />
      </div>
      <div class="button-group">
        <button on:click={identifyUser} disabled={!widgetReady || !userName || !userEmail}>
          Identify User
        </button>
        <button on:click={clearUser}>
          Clear User
        </button>
      </div>
      {#if currentUser}
        <div class="user-info">
          <strong>Current User:</strong> {currentUser.name} ({currentUser.email})
        </div>
      {/if}
    </div>

    <div class="logs-section">
      <h2>Event Logs</h2>
      <div class="button-group">
        <button on:click={clearLogs}>Clear Logs</button>
      </div>
      <div class="logs">
        {#each eventLogs as log}
          <div class="log-entry">
            <span class="log-time">[{log.time}]</span>
            <span class="log-event">{log.event}</span>
            {#if log.data}
              <pre class="log-data">{log.data}</pre>
            {/if}
          </div>
        {/each}
        {#if eventLogs.length === 0}
          <div class="no-logs">No events yet...</div>
        {/if}
      </div>
    </div>

    <div class="installation-section">
      <h2>Installation & Usage</h2>
      <div class="code-block">
        <h3>1. Install the package</h3>
        <pre><code>npm install @ticketping/chat-widget</code></pre>

        <h3>2. Use in your Svelte component</h3>
        <pre><code>&lt;script&gt;
  import TicketpingChat from './TicketpingChat.svelte';

  let currentUser = &#123;
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    userJWT: 'your-jwt-token'
  &#125;;

  const theme = &#123;
    primaryColor: '#667eea',
    primaryButtonBg: '#667eea',
    // ... other theme options
  &#125;;
&lt;/script&gt;

&lt;TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  user=&#123;currentUser&#125;
  theme=&#123;theme&#125;
  debug=&#123;true&#125;
  on:ready=&#123;() =&gt; console.log('Widget ready!')&#125;
  on:messageSent=&#123;(e) =&gt; console.log('Message sent:', e.detail)&#125;
  on:messageReceived=&#123;(e) =&gt; console.log('Message received:', e.detail)&#125;
/&gt;</code></pre>
      </div>
    </div>
  </div>

  <!-- The actual widget component -->
  <TicketpingChat
    bind:this={chatWidget}
    appId={config.appId}
    teamSlug={config.teamSlug}
    apiBase={config.apiBase}
    wsBase={config.wsBase}
    user={currentUser}
    theme={config.theme}
    debug={config.debug}
    showPulseAnimation={config.showPulseAnimation}
    analytics={config.analytics}
    open={isWidgetOpen}
    onready={handleReady}
    onopen={handleOpen}
    onclose={handleClose}
    onmessageSent={handleMessageSent}
    onmessageReceived={handleMessageReceived}
    onconversationStarted={handleConversationStarted}
    onerror={handleError}
  />
</main>

<style>
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 0;
    background: #f8f9fa;
    line-height: 1.6;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
  }

  header {
    text-align: center;
    margin-bottom: 40px;
  }

  header h1 {
    color: #2d3748;
    margin-bottom: 10px;
  }

  header p {
    color: #4a5568;
    font-size: 18px;
  }

  .status-section, .controls-section, .user-section, .logs-section, .installation-section {
    background: white;
    padding: 24px;
    margin-bottom: 24px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  h2 {
    color: #2d3748;
    margin-bottom: 16px;
    border-bottom: 2px solid #667eea;
    padding-bottom: 8px;
  }

  .status {
    padding: 12px 16px;
    border-radius: 8px;
    margin: 8px 0;
    font-weight: 500;
  }

  .status.ready {
    background: #c6f6d5;
    color: #2f855a;
    border: 1px solid #9ae6b4;
  }

  .status.loading {
    background: #fed7d7;
    color: #c53030;
    border: 1px solid #feb2b2;
  }

  .status.open {
    background: #e6fffa;
    color: #319795;
    border: 1px solid #81e6d9;
  }

  .status.closed {
    background: #edf2f7;
    color: #4a5568;
    border: 1px solid #cbd5e0;
  }

  .button-group {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 16px 0;
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: #667eea;
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: #5a6fd8;
    transform: translateY(-1px);
  }

  button:disabled {
    background: #a0aec0;
    cursor: not-allowed;
    transform: none;
  }

  .form-group {
    margin: 12px 0;
  }

  label {
    display: block;
    font-weight: 500;
    margin-bottom: 4px;
    color: #2d3748;
  }

  input {
    width: 100%;
    max-width: 300px;
    padding: 8px 12px;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .user-info {
    margin-top: 12px;
    padding: 12px;
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 6px;
    color: #2f855a;
  }

  .logs {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f8f9fa;
  }

  .log-entry {
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .log-time {
    color: #718096;
    font-size: 12px;
    margin-right: 8px;
  }

  .log-event {
    font-weight: 500;
    color: #2d3748;
  }

  .log-data {
    margin: 4px 0 0 0;
    padding: 8px;
    background: #2d3748;
    color: #e2e8f0;
    border-radius: 4px;
    font-size: 11px;
    overflow-x: auto;
  }

  .no-logs {
    padding: 20px;
    text-align: center;
    color: #718096;
    font-style: italic;
  }

  .code-block {
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
  }

  .code-block h3 {
    margin: 0 0 12px 0;
    color: #2d3748;
  }

  .code-block pre {
    background: #2d3748;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
  }

  .code-block code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
  }
</style>

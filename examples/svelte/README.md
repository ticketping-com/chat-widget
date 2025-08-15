# Ticketping Chat Widget - Svelte Integration

This example demonstrates how to integrate the Ticketping Chat Widget into Svelte applications. We provide components for both Svelte 4 and Svelte 5.

## 📁 Available Components

- **`TicketpingChat.svelte`** - Svelte 5 version using runes system
- **`TicketpingChat-svelte4.svelte`** - Svelte 4 compatible version

## 🚀 Quick Start

### Choose Your Version

**For Svelte 5 projects:**
- Use `TicketpingChat.svelte` 
- Requires Svelte 5.0.0 or later
- Uses modern runes syntax (`$state`, `$props`, `$effect`)

**For Svelte 4 projects:**
- Use `TicketpingChat-svelte4.svelte`
- Compatible with Svelte 4.x
- Uses traditional syntax (`export let`, `createEventDispatcher`)

### 1. Install the Package

```bash
npm install @ticketping/chat-widget
```

### 2. Copy the Component

**For Svelte 5:**
```bash
cp TicketpingChat.svelte src/lib/
```

**For Svelte 4:**
```bash
cp TicketpingChat-svelte4.svelte src/lib/TicketpingChat.svelte
```

### 3. Use in Your App

**Svelte 5 Version:**
```svelte
<script>
  import TicketpingChat from '$lib/TicketpingChat.svelte';

  let currentUser = $state({
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    userJWT: 'your-jwt-token' // From your authentication system
  });

  const theme = {
    primaryColor: '#667eea',
    primaryButtonBg: '#667eea',
    primaryButtonText: '#ffffff',
    primaryHover: '#5a6fd8'
  };

  function handleMessageSent(message) {
    console.log('Message sent:', message);
  }

  function handleMessageReceived(message) {
    console.log('Message received:', message);
  }
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  teamLogoIcon="cdn-link-to-your-logo-square"
  user={currentUser}
  theme={theme}
  debug={true}
  onready={() => console.log('Widget ready!')}
  onmessageSent={handleMessageSent}
  onmessageReceived={handleMessageReceived}
/>
```

**Svelte 4 Version:**
```svelte
<script>
  import TicketpingChat from '$lib/TicketpingChat.svelte';

  let currentUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    userJWT: 'your-jwt-token' // From your authentication system
  };

  const theme = {
    primaryColor: '#667eea',
    primaryButtonBg: '#667eea',
    primaryButtonText: '#ffffff',
    primaryHover: '#5a6fd8'
  };

  function handleMessageSent(event) {
    console.log('Message sent:', event.detail);
  }

  function handleMessageReceived(event) {
    console.log('Message received:', event.detail);
  }
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  teamLogoIcon="cdn-link-to-your-logo-square"
  user={currentUser}
  theme={theme}
  debug={true}
  on:ready={() => console.log('Widget ready!')}
  on:messageSent={handleMessageSent}
  on:messageReceived={handleMessageReceived}
/>
```

## 📋 Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | `string` | `''` | Your Ticketping app ID |
| `teamSlug` | `string` | `''` | Your team slug |
| `teamLogoIcon` | `string` | `''` | Your team logo icon cdn link  |
| `apiBase` | `string` | `'https://api.ticketping.com'` | API base URL |
| `wsBase` | `string` | `'wss://api.ticketping.com'` | WebSocket base URL |
| `userJWT` | `string` | `null` | JWT token for authenticated users |
| `debug` | `boolean` | `false` | Enable debug mode |
| `showPulseAnimation` | `boolean` | `true` | Show pulse animation on widget |
| `analytics` | `boolean` | `true` | Enable analytics tracking |
| `theme` | `object` | `null` | Custom theme configuration |
| `open` | `boolean` | `false` | Control widget open/closed state |
| `user` | `object` | `null` | User identification data |

## 🎨 Theme Configuration

The `theme` prop accepts an object with the following properties:

```javascript
const theme = {
  primaryColor: '#667eea',
  primaryButtonBg: '#667eea',
  primaryButtonText: '#ffffff',
  primaryHover: '#5a6fd8',
  textPrimary: '#2d3748',
  textSecondary: '#4a5568',
  textMuted: '#718096',
  textWhite: '#ffffff',
  background: '#ffffff',
  backgroundSecondary: '#f7fafc',
  backgroundTertiary: '#edf2f7',
  border: '#e2e8f0',
  borderLight: '#edf2f7',
  borderCard: '#e2e8f0',
  notificationBg: '#fef5e7',
  successColor: '#38a169',
  offlineColor: '#718096',
  errorBg: '#feb2b2',
  errorText: '#c53030',
  errorBorder: '#fed7d7',
  pulseColor: '#667eea',
  shadowLight: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  overlayLight: 'rgba(255, 255, 255, 0.9)'
};
```

## 📡 Events

### Svelte 5 Version
The component accepts event handler props using function props:

| Event Handler | Payload | Description |
|---------------|---------|-------------|
| `onready` | `null` | Widget is initialized and ready |
| `onopen` | `null` | Widget was opened |
| `onclose` | `null` | Widget was closed |
| `onmessageSent` | `message` | User sent a message |
| `onmessageReceived` | `message` | Received a message from agent |
| `onconversationStarted` | `conversationId` | New conversation started |
| `onerror` | `error` | An error occurred |

**Svelte 5 Event Example:**
```svelte
<script>
  function handleMessageSent(message) {
    console.log('Message sent:', message);
    analytics.track('chat_message_sent', { messageId: message.id });
  }
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  onmessageSent={handleMessageSent}
/>
```

### Svelte 4 Version
The component uses traditional Svelte events with `createEventDispatcher`:

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | `null` | Widget is initialized and ready |
| `open` | `null` | Widget was opened |
| `close` | `null` | Widget was closed |
| `messageSent` | `message` | User sent a message |
| `messageReceived` | `message` | Received a message from agent |
| `conversationStarted` | `conversationId` | New conversation started |
| `error` | `error` | An error occurred |

**Svelte 4 Event Example:**
```svelte
<script>
  function handleMessageSent(event) {
    console.log('Message sent:', event.detail);
    analytics.track('chat_message_sent', { messageId: event.detail.id });
  }
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  on:messageSent={handleMessageSent}
/>
```

## 🔧 Methods

You can call methods on the widget using a component reference:

**Svelte 5 Version:**
```svelte
<script>
  let chatWidget = $state();

  function openWidget() {
    chatWidget.openWidget();
  }

  function identifyUser() {
    chatWidget.identifyUser({
      userJWT: 'jwt-token'
    });
  }
</script>

<TicketpingChat bind:this={chatWidget} appId="your-app-id" teamSlug="your-team-slug" />
<button onclick={openWidget}>Open Chat</button>
```

**Svelte 4 Version:**
```svelte
<script>
  let chatWidget;

  function openWidget() {
    chatWidget.openWidget();
  }

  function identifyUser() {
    chatWidget.identifyUser({
      userJWT: 'jwt-token'
    });
  }
</script>

<TicketpingChat bind:this={chatWidget} appId="your-app-id" teamSlug="your-team-slug" />
<button on:click={openWidget}>Open Chat</button>
```

Available methods:
- `openWidget()` - Open the widget
- `closeWidget()` - Close the widget
- `toggleWidget()` - Toggle widget open/closed
- `startConversation()` - Start a new conversation
- `identifyUser(userData)` - Identify the current user
- `isReady()` - Check if widget is ready

## 🔐 User Authentication

For authenticated users, provide user data and JWT token:

```svelte
<script>
  import { onMount } from 'svelte';
  
  let user = $state(null);

  onMount(async () => {
    // Get user data from your authentication system
    const authUser = await getCurrentUser();
    
    user = {
      userJWT: authUser.chatToken // JWT token for chat authentication
    };
  });
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  user={user}
/>
```

## 🌐 SSR Considerations

The component handles SSR properly by:

1. Using dynamic imports to avoid server-side execution
2. Checking for `window` object availability
3. Lazy loading the widget CSS

If you're using SvelteKit, no additional configuration is needed.

## 🔄 Migration Guide (Svelte 4 → 5)

If you're upgrading from Svelte 4 to 5, here are the key changes:

### Component Usage Changes

| Svelte 4 | Svelte 5 | Notes |
|----------|----------|-------|
| `let widget;` | `let widget = $state();` | State variables use `$state()` |
| `export let user = null;` | `let { user = null } = $props();` | Props use destructuring |
| `on:ready={handler}` | `onready={handler}` | Events become function props |
| `event.detail` | Direct parameter | No more event wrapper object |
| `$: reactive` | `$effect(() => {})` | Side effects use `$effect()` |

### Quick Migration Steps

1. **Replace the component file:**
   ```bash
   # Remove old version
   rm src/lib/TicketpingChat.svelte
   
   # Copy new version
   cp TicketpingChat.svelte src/lib/
   ```

2. **Update your component usage:**
   ```diff
   - <TicketpingChat on:ready={handleReady} on:error={handleError} />
   + <TicketpingChat onready={handleReady} onerror={handleError} />
   ```

3. **Update event handlers:**
   ```diff
   - function handleError(event) {
   -   console.error(event.detail);
   - }
   + function handleError(error) {
   +   console.error(error);
   + }
   ```

4. **Update state variables:**
   ```diff
   - let isOpen = false;
   + let isOpen = $state(false);
   ```

## 🆕 Svelte 5 Features Used

This integration takes advantage of several new Svelte 5 features:

### Runes System
- **`$state()`** - For reactive variables that automatically trigger updates
- **`$derived()`** - For computed values that update when dependencies change  
- **`$effect()`** - For side effects that run when dependencies change
- **`$props()`** - For declaring component props with destructuring

### Event Handling
- **Function Props** - Events are handled via function props instead of `createEventDispatcher`
- **Direct Function Calls** - Event handlers receive data directly, not wrapped in event objects

### Example Comparison

**Svelte 4:**
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  export let open = false;
  let widget = null;
  
  $: if (widget && open) {
    widget.open();
  }
  
  function handleReady() {
    dispatch('ready');
  }
</script>
```

**Svelte 5:**
```svelte
<script>
  let { open = false, onready = () => {} } = $props();
  let widget = $state(null);
  
  $effect(() => {
    if (widget && open) {
      widget.open();
    }
  });
  
  function handleReady() {
    onready();
  }
</script>
```

## 🎯 Real-world Example

Here's a complete example for a typical e-commerce site:

**Svelte 5 Version:**
```svelte
<script>
  import { user } from '$lib/stores/auth';
  import TicketpingChat from '$lib/TicketpingChat.svelte';

  let chatWidget = $state();
  let showChat = $state(false);

  const theme = {
    primaryColor: '#1f2937',
    primaryButtonBg: '#1f2937',
    primaryButtonText: '#ffffff',
    primaryHover: '#111827'
  };

  function handleMessageSent(message) {
    gtag('event', 'chat_message_sent', {
      conversation_id: message.conversationId
    });
  }

  // Show chat only for logged-in users
  $effect(() => {
    if ($user) {
      showChat = true;
    }
  });
</script>

{#if showChat}
  <TicketpingChat
    bind:this={chatWidget}
    appId="your-app-id"
    teamSlug="your-team-slug"
    user={$user}
    theme={theme}
    analytics={true}
    onmessageSent={handleMessageSent}
  />
{/if}
```

**Svelte 4 Version:**
```svelte
<script>
  import { user } from '$lib/stores/auth';
  import TicketpingChat from '$lib/TicketpingChat.svelte';

  let chatWidget;
  let showChat = false;

  const theme = {
    primaryColor: '#1f2937',
    primaryButtonBg: '#1f2937',
    primaryButtonText: '#ffffff',
    primaryHover: '#111827'
  };

  function handleMessageSent(event) {
    gtag('event', 'chat_message_sent', {
      conversation_id: event.detail.conversationId
    });
  }

  // Show chat only for logged-in users
  $: if ($user) {
    showChat = true;
  }
</script>

{#if showChat}
  <TicketpingChat
    bind:this={chatWidget}
    appId="your-app-id"
    teamSlug="your-team-slug"
    user={$user}
    theme={theme}
    analytics={true}
    on:messageSent={handleMessageSent}
  />
{/if}
```

## 🐛 Troubleshooting

### CSS Import Error

If you get an error like `Missing "./dist/widget.css" specifier`, the component automatically imports the CSS using the correct path (`@ticketping/chat-widget/style`). This should work out of the box.

If you need to import CSS manually for any reason, use:
```javascript
// ✅ Correct
import '@ticketping/chat-widget/style';

// ❌ Wrong - will cause import error
import '@ticketping/chat-widget/dist/widget.css';
```

### Widget Not Loading

1. Check that you've installed the npm package: `npm list @ticketping/chat-widget`
2. Verify your `appId` and `teamSlug` are correct
3. Check browser console for errors
4. Enable `debug={true}` for more logging

### Styles Not Applied

1. Make sure the CSS is imported (component handles this automatically)
2. Check for CSS conflicts with your global styles
3. Use browser dev tools to inspect the widget elements
4. Verify the CSS loaded by checking Network tab in DevTools

### Events Not Firing

1. **Svelte 5**: Ensure you're using function props (`onready`, `onerror`)
2. **Svelte 4**: Ensure you're using event syntax (`on:ready`, `on:error`)
3. Check that the widget is ready before expecting events
4. Use the ready event to know when the widget is initialized

### Import Errors

If you see module resolution errors:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For SvelteKit projects, restart dev server
npm run dev
```

## 📚 Additional Resources

- [Ticketping Documentation](https://docs.ticketping.com)
- [Widget API Reference](https://docs.ticketping.com/chat-widget/api)
- [Svelte Documentation](https://svelte.dev/docs)

## 🤝 Support

For widget-specific issues:
- GitHub Issues: [Create an issue](https://github.com/ticketping-com/chat-widget/issues)
- Documentation: [Widget docs](https://docs.ticketping.com/chat-widget)

# Ticketping Chat Widget

A modern, customizable customer support chat widget with real-time messaging capabilities. Built for seamless integration into any website.

[![npm version](https://badge.fury.io/js/%40ticketping%2Fchat-widget.svg)](https://badge.fury.io/js/%40ticketping%2Fchat-widget)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This widget is meant to be used with [Ticketping](https://ticketping.com) - Customer support meets Slack

## Features

- **Real-time messaging** with WebSocket support
- **Fully customizable** themes and colors
- **Mobile responsive** design
- **Conversation history** and persistence
- **File attachments** support
- **Secure authentication** with JWT
- **Lightweight** (< 50KB gzipped)

|       | URL                                                                 |
|----------------|---------------------------------------------------------------------|
| Documentation  | [docs.ticketping.com](https://docs.ticketping.com/docs)             |
| Demo        | [Ticketping](https://ticketping.com)                                |
| Email          | support@ticketping.com                                              |
| Issues         | [GitHub Issues](https://github.com/ticketping-com/chat-widget/issues) |
| NPM         | [NPM Package](https://www.npmjs.com/package/@ticketping/chat-widget) |


## Installation

```bash
npm install @ticketping/chat-widget
```

Or via CDN:

```html
<script src="https://unpkg.com/@ticketping/chat-widget@latest/dist/widget.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@ticketping/chat-widget@latest/dist/widget.css">
```

## Quick Start

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/@ticketping/chat-widget@latest/dist/widget.css">
</head>
<body>
    <script src="https://unpkg.com/@ticketping/chat-widget@latest/dist/widget.min.js"></script>
    <script>
        window.TicketpingChat.init({
            appId: 'your-app-id',
            teamSlug: 'your-team-slug',
            teamLogoIcon: 'cdn-link-to-your-logo-square',
        });
    </script>
</body>
</html>
```

### ES Modules

```javascript
import TicketpingChat from '@ticketping/chat-widget';
import '@ticketping/chat-widget/style';

const chat = new TicketpingChat({
    appId: 'your-app-id',
    teamSlug: 'your-team-slug',
    teamLogoIcon: 'cdn-link-to-your-logo-square',
});
```

### React Integration

```javascript
// Install the package and React
npm install @ticketping/chat-widget react
```

```jsx
import React, { useRef } from 'react';
import TicketpingChat from '@ticketping/chat-widget/react';

function App() {
  const chatRef = useRef();

  return (
    <div>
      <h1>My App</h1>
      
      <TicketpingChat
        ref={chatRef}
        appId="your-app-id"
        teamSlug="your-team-slug"
        teamLogoIcon="cdn-link-to-your-logo-square"
      />
    </div>
  );
}

export default App;
```

#### Custoizing theme and troubleshooting

Read more on [react docs](https://docs.ticketping.com/docs/react-nextjs).

#### React Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | `string` | `''` | Your Ticketping app ID |
| `teamSlug` | `string` | `''` | Your team slug |
| `teamLogoIcon` | `string` | `''` | URL to your team logo |
| `apiBase` | `string` | `'https://api.ticketping.com'` | API base URL |
| `wsBase` | `string` | `'wss://api.ticketping.com'` | WebSocket base URL |
| `userJWT` | `string` | `''` | User authentication token |
| `debug` | `boolean` | `false` | Enable debug mode |
| `analytics` | `boolean` | `true` | Enable analytics |
| `theme` | `object` | `null` | Custom theme configuration |
| `open` | `boolean` | `false` | Control widget open state |


### Svelte Integration

#### Svelte 5 (Recommended)

```javascript
// Install the package and Svelte
npm install @ticketping/chat-widget
```

```svelte
<script>
  import TicketpingChat from '@ticketping/chat-widget/svelte';
  import('@ticketping/chat-widget/style')
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  teamLogoIcon="cdn-link-to-your-logo-square"
/>
```

#### Svelte 4

```javascript
// Install the package and Svelte 4
npm install @ticketping/chat-widget svelte@^4.0.0
```

```svelte
<script>
  import TicketpingChat from '@ticketping/chat-widget/svelte4';
  import('@ticketping/chat-widget/style')
</script>

<TicketpingChat
  appId="your-app-id"
  teamSlug="your-team-slug"
  teamLogoIcon="cdn-link-to-your-logo-square"
/>
```

#### Svelte Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | `string` | `''` | Your Ticketping app ID |
| `teamSlug` | `string` | `''` | Your team slug |
| `teamLogoIcon` | `string` | `''` | URL to your team logo |
| `apiBase` | `string` | `'https://api.ticketping.com'` | API base URL |
| `wsBase` | `string` | `'wss://api.ticketping.com'` | WebSocket base URL |
| `userJWT` | `string` | `''` | User authentication token |
| `debug` | `boolean` | `false` | Enable debug mode |
| `analytics` | `boolean` | `true` | Enable analytics |
| `theme` | `object` | `null` | Custom theme configuration |
| `open` | `boolean` | `false` | Control widget open state |
| `userData` | `object` | `null` | User identification data |


## Configuration

### Basic Configuration

```javascript
window.TicketpingChat.init({
    // Required
    appId: 'your-app-id',
    teamSlug: 'your-team-slug',
    teamLogoIcon: 'cdn-link-to-your-logo-square',
    
    // Optional - API endpoints
    apiBase: 'https://api.ticketping.com',
    wsBase: 'wss://ws.ticketping.com',
    
    // Optional - Authentication
    userJWT: 'your-user-jwt-token',
    
    // Optional - Behavior
    autoOpen: false,
    position: 'bottom-right' // or 'bottom-left'
});
```

### Custom Theme

```javascript
window.TicketpingChat.init({
    appId: 'your-app-id',
    teamSlug: 'your-team-slug',
    teamLogoIcon: 'cdn-link-to-your-logo-square',
    theme: {
        // Primary colors
        primaryColor: '#3b82f6',           // Main brand/accent color
        primaryButtonText: '#ffffff',      // Text color on primary buttons
        primaryHover: '#2563eb',           // Hover state for primary color
        iconColor: '#ffffff',              // Icon color (e.g., in chat bubble)
        
        // Text colors
        textPrimary: '#374151',            // Main text color
        textSecondary: '#747d8f',          // Secondary text color
        textMuted: '#c3c5ca',              // Muted/disabled text color
        
        // Background colors
        background: '#ffffff',             // Main background color
        backgroundSecondary: '#f9fafb',    // Secondary background areas
        backgroundTertiary: '#e5e7eb',     // Tertiary background areas
        
        // Border colors
        border: '#e9e9e9',                 // Default border color
        borderLight: '#f3f3f3',            // Light border color
        
        // Status colors
        notificationBg: '#ff4757',         // Notification badge background
        successColor: '#4caf50',           // Success state color
        offlineColor: '#9e9e9e',           // Offline status color
        
        // Error colors
        errorBg: '#ffebee',                // Error background color
        errorText: '#c62828',              // Error text color
        errorBorder: '#f44336',            // Error border color
        
        // Shadow colors (for advanced customization)
        shadowLight: 'rgba(15, 15, 15, 0.06)',    // Light shadow
        shadowMedium: 'rgba(15, 15, 15, 0.16)',   // Medium shadow
        shadowDark: 'rgba(9, 14, 21, 0.06)',      // Dark shadow
    }
});
```

The widget supports extensive theming through CSS custom properties:

```css
:root {
    /* Primary colors */
    --tp-primary-color: #3b82f6;
    --tp-primary-button-text: #ffffff;
    --tp-primary-hover: #2563eb;
    --tp-icon-color: #ffffff;

    /* Text colors */
    --tp-text-primary: #374151;
    --tp-text-secondary: #747d8f;
    --tp-text-muted: #c3c5ca;
    
    /* Background colors */
    --tp-background: #ffffff;
    --tp-background-secondary: #f9fafb;
    --tp-background-tertiary: #e5e7eb;
    
    /* Border colors */
    --tp-border: #e9e9e9;
    --tp-border-light: #f3f3f3;
    
    /* Status colors */
    --tp-notification-bg: #ff4757;
    --tp-success-color: #4caf50;
    --tp-offline-color: #9e9e9e;
    
    /* Error colors */
    --tp-error-bg: #ffebee;
    --tp-error-text: #c62828;
    --tp-error-border: #f44336;
    
    /* Shadow colors */
    --tp-shadow-light: rgba(15, 15, 15, 0.06);
    --tp-shadow-medium: rgba(15, 15, 15, 0.16);
    --tp-shadow-dark: rgba(9, 14, 21, 0.06);
}
```


### Event Callbacks

```javascript
window.TicketpingChat.init({
    appId: 'your-app-id',
    teamSlug: 'your-team-slug',
    teamLogoIcon: 'cdn-link-to-your-logo-square',
    
    // Event callbacks
    onReady: () => console.log('Widget ready'),
    onOpen: () => console.log('Widget opened'),
    onClose: () => console.log('Widget closed'),
    onMessageSent: (message) => console.log('Message sent:', message),
    onMessageReceived: (message) => console.log('Message received:', message),
    onConversationStarted: (id) => console.log('Conversation started:', id),
    onError: (error) => console.error('Widget error:', error)
});
```

## API Methods

After initialization, you can control the widget programmatically:

```javascript
const chat = window.TicketpingChat;

// Open/close the widget
chat.open();
chat.close();

// Identify the current user
chat.identify({
    id: 'user-123',
    email: 'user@example.com',
    name: 'John Doe',
    userJWT: 'your-user-jwt'
});

// Start a new conversation
chat.startConversation();

// Clean up
chat.destroy();
```

## Theming


## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Examples

Check out the `/examples` directory for integration examples with:
- Vanilla JavaScript
- React
- Next.js
- Svelte

## License

MIT © [Ticketping](https://ticketping.com)

## Support

- 🌐 Website: [Ticketping](https://ticketping.com)
- 📧 Email: support@ticketping.com
- 🐛 Issues: [GitHub Issues](https://github.com/ticketping-com/chat-widget/issues)
- 📖 Documentation: [docs.ticketping.com](https://docs.ticketping.com/docs) 
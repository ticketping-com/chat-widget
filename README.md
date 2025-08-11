# Ticketping Chat Widget

A modern, customizable customer support chat widget with real-time messaging capabilities. Built for seamless integration into any website.

[![npm version](https://badge.fury.io/js/%40ticketping%2Fchat-widget.svg)](https://badge.fury.io/js/%40ticketping%2Fchat-widget)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This widget is meant to be used with [Ticketping](https://ticketping.com) - Customer support meets Slack

## Features

- 🚀 **Real-time messaging** with WebSocket support
- 🎨 **Fully customizable** themes and colors
- 📱 **Mobile responsive** design
- 💬 **Conversation history** and persistence
- 📎 **File attachments** support
- 🔔 **Typing indicators** and notifications
- 🌙 **Dark/Light theme** support
- 🛡️ **Secure authentication** with JWT
- ⚡ **Lightweight** (< 50KB gzipped)

## Installation

```bash
npm install @ticketping/chat-widget
```

NPM link: https://www.npmjs.com/package/@ticketping/chat-widget

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

```jsx
import { useEffect } from 'react';
import '@ticketping/chat-widget/style';

function App() {
    useEffect(() => {
        const loadChat = async () => {
            const { default: TicketpingChat } = await import('@ticketping/chat-widget');
            
            new TicketpingChat({
                appId: 'your-app-id',
                teamSlug: 'your-team-slug',
                teamLogoIcon: 'cdn-link-to-your-logo-square',
                onReady: () => console.log('Chat ready'),
                onMessageReceived: (message) => console.log('New message:', message)
            });
        };

        loadChat();
    }, []);

    return <div>Your React App</div>;
}
```

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
    showPulseAnimation: true,
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
        primaryColor: '#FF78B1',
        primaryHover: '#FF529A',
        textPrimary: '#333333',
        textSecondary: '#666666',
        background: '#ffffff',
        backgroundSecondary: '#f9fafb',
        border: '#e9e9e9',
        // ... more theme options
    }
});
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

The widget supports extensive theming through CSS custom properties:

```css
:root {
    --tp-primary-color: #your-brand-color;
    --tp-text-primary: #333333;
    --tp-background: #ffffff;
    /* ... more variables */
}
```

### Available Theme Variables

- `--tp-primary-color` - Primary brand color
- `--tp-primary-hover` - Primary color hover state
- `--tp-text-primary` - Primary text color
- `--tp-text-secondary` - Secondary text color
- `--tp-text-muted` - Muted text color
- `--tp-background` - Main background color
- `--tp-background-secondary` - Secondary background color
- `--tp-border` - Border color
- And many more...

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
- 📖 Documentation: [docs.ticketping.com](https://docs.ticketping.com) 
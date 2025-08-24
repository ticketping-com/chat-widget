# Using Ticketping Chat Widget React Component

## 🚀 Quick Start (Recommended)

The easiest way to use the Ticketping Chat Widget in React/Next.js:

```tsx
import TicketpingChat from '@ticketping/chat-widget/react';

function MyApp() {
  return (
    <div>
      <h1>My App</h1>
      
      <TicketpingChat
        appId="your-app-id"
        teamSlug="your-team-slug"
        onReady={() => console.log('Chat widget ready!')}
        onError={(error) => console.error('Chat error:', error)}
      />
    </div>
  );
}
```

## 🎨 With Custom Theme

```tsx
import TicketpingChat from '@ticketping/chat-widget/react';

const customTheme = {
  primaryColor: '#007BFF',
  primaryButtonBg: '#007BFF',
  primaryButtonText: '#ffffff',
  background: '#ffffff',
  textPrimary: '#1a202c',
  // ... more theme options
};

function MyApp() {
  return (
    <TicketpingChat
      appId="your-app-id"
      teamSlug="your-team-slug"
      theme={customTheme}
      debug={true}
      onReady={() => console.log('Widget ready!')}
      onOpen={() => console.log('Widget opened!')}
      onClose={() => console.log('Widget closed!')}
      onMessageSent={(message) => console.log('Message sent:', message)}
    />
  );
}
```

## 🔧 If Import Doesn't Work

If you get module resolution errors, try one of these solutions:

### Solution 1: Update your tsconfig.json
```json
{
  "compilerOptions": {
    "moduleResolution": "node16"  // or "bundler"
  }
}
```

### Solution 2: Use Direct Import (Alternative)
If the module resolution still doesn't work, you can use the direct integration approach (see `TicketpingWidget.tsx` in this example).

## 📋 All Props

```tsx
interface TicketpingChatProps {
  appId?: string;
  teamSlug?: string;
  teamLogoIcon?: string;
  apiBase?: string;
  wsBase?: string;
  userJWT?: string;
  debug?: boolean;
  analytics?: boolean;
  theme?: TicketpingChatTheme;
  onReady?: () => void;
  onError?: (error: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: TicketpingChatMessage) => void;
  onMessageReceived?: (message: TicketpingChatMessage) => void;
  onConversationStarted?: (id: string) => void;
}
```

## 🔐 User Identification

To identify users, use the global window object:

```tsx
const identifyUser = () => {
  if (window.TicketpingChat?.instance) {
    window.TicketpingChat.identify({
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Corp',
      userJWT: 'your-jwt-token'
    });
  }
};

// Call in onReady or after user login
<TicketpingChat
  onReady={() => {
    // Auto-identify when widget is ready
    identifyUser();
  }}
/>
```

## 🎯 That's it!

The React component handles all the complexity for you:
- ✅ SSR/Client-side rendering
- ✅ Dynamic imports
- ✅ Cleanup on unmount
- ✅ TypeScript support
- ✅ All callback events

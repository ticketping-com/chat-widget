# Ticketping Chat Widget - Next.js Integration

Simple example showing how to integrate the Ticketping Chat Widget into a Next.js application using the npm package. Compatible with **Next.js 13+ (both App Router and Pages Router)**.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Installation

```bash
npm install @ticketping/chat-widget
```

## 📋 Copy-Paste Integration

### Widget Component

Copy this component to `components/TicketpingWidget.tsx`:

```tsx
import { useEffect, useRef } from 'react'

interface TicketpingWidgetProps {
  appId: string;
  teamSlug: string;
  teamLogoIcon?: string;
  apiBase?: string;
  wsBase?: string;
  userJWT?: string;
  debug?: boolean;
  showPulseAnimation?: boolean;
  analytics?: boolean;
  theme?: any;
  onReady?: () => void;
  onError?: (error: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: any) => void;
  onMessageReceived?: (message: any) => void;
  onConversationStarted?: (id: string) => void;
}

const TicketpingWidget: React.FC<TicketpingWidgetProps> = ({
  appId,
  teamSlug,
  teamLogoIcon,
  apiBase = 'https://api.ticketping.com',
  wsBase = 'wss://ws.ticketping.com',
  userJWT,
  debug = false,
  showPulseAnimation = true,
  analytics = true,
  theme,
  onReady,
  onError,
  onOpen,
  onClose,
  onMessageSent,
  onMessageReceived,
  onConversationStarted
}) => {
  const widgetRef = useRef<any>(null)
  const widgetReadyRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadWidget = async () => {
      try {
        // Dynamic import of the widget package
        const TicketpingChat = await import('@ticketping/chat-widget')
        
        // Import CSS
        await import('@ticketping/chat-widget/style')

        // Configuration object
        const config = {
          appId,
          teamSlug,
          teamLogoIcon,
          apiBase,
          wsBase,
          userJWT,
          debug,
          showPulseAnimation,
          analytics,
          theme,
          onReady: () => {
            widgetReadyRef.current = true
            onReady?.()
          },
          onOpen,
          onClose,
          onMessageSent,
          onMessageReceived,
          onConversationStarted,
          onError
        }

        // Initialize the widget
        widgetRef.current = window.TicketpingChat.init(config)

      } catch (error) {
        console.error('Failed to load Ticketping Chat Widget:', error)
        onError?.(error)
      }
    }

    loadWidget()

    // Cleanup on unmount
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy()
        widgetRef.current = null
        widgetReadyRef.current = false
      }
    }
  }, []) // Only run once on mount

  return null // Widget renders itself into DOM
}

export default TicketpingWidget
```

## 📁 Usage Examples

### App Router (Next.js 13.4+)

```tsx
// app/page.tsx
'use client'

import TicketpingWidget from '@/components/TicketpingWidget'

export default function Home() {
  return (
    <div>
      <h1>My App</h1>
      
      <TicketpingWidget
        appId="your-app-id"
        teamSlug="your-team-slug"
        onReady={() => console.log('Widget ready!')}
      />
    </div>
  )
}
```

### Pages Router (Next.js 13+)

```tsx
// pages/index.tsx
import TicketpingWidget from '../components/TicketpingWidget'

export default function Home() {
  return (
    <div>
      <h1>My App</h1>
      
      <TicketpingWidget
        appId="your-app-id"
        teamSlug="your-team-slug"
        onReady={() => console.log('Widget ready!')}
      />
    </div>
  )
}
```

## 🔧 Configuration

### Required Props
- `appId` - Your Ticketping app ID
- `teamSlug` - Your team slug from Ticketping dashboard

### Optional Props
- `teamLogoIcon` - URL to your team logo
- `apiBase` - API base URL (defaults to production)
- `wsBase` - WebSocket base URL (defaults to production)
- `userJWT` - JWT token for authenticated users
- `debug` - Enable debug mode (default: false)
- `showPulseAnimation` - Show pulse animation (default: true)
- `analytics` - Enable analytics (default: true)
- `theme` - Custom theme object
- `onReady` - Callback when widget is ready
- `onError` - Callback for error handling
- `onOpen` - Callback when widget opens
- `onClose` - Callback when widget closes
- `onMessageSent` - Callback when message is sent
- `onMessageReceived` - Callback when message is received
- `onConversationStarted` - Callback when conversation starts

## 👤 User Identification

Identify users when they log in to your app:

```tsx
const identifyUser = () => {
  if (window.TicketpingChat?.instance) {
    window.TicketpingChat.identify({
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company,
      userJWT: userJwtToken // Get from your auth system
    })
  }
}
```

## 🎮 Widget Controls

```tsx
// Open widget
window.TicketpingChat?.open()

// Close widget
window.TicketpingChat?.close()

// Start conversation
window.TicketpingChat?.startConversation()
```

## 🌍 Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_TICKETPING_APP_ID=your-app-id
NEXT_PUBLIC_TICKETPING_TEAM_SLUG=your-team-slug
NEXT_PUBLIC_TICKETPING_LOGO=https://your-logo.com/logo.png
```

Use in component:

```tsx
<TicketpingWidget
  appId={process.env.NEXT_PUBLIC_TICKETPING_APP_ID!}
  teamSlug={process.env.NEXT_PUBLIC_TICKETPING_TEAM_SLUG!}
  teamLogoIcon={process.env.NEXT_PUBLIC_TICKETPING_LOGO}
/>
```

## ✅ Compatibility

- ✅ Next.js 13+ (App Router)
- ✅ Next.js 13+ (Pages Router)
- ✅ TypeScript
- ✅ React 18
- ✅ Uses npm package `@ticketping/chat-widget`
- ✅ Client-side rendering safe
- ✅ Production builds

## 🚀 Deployment

Works on all Next.js hosting platforms:
- Vercel
- Netlify
- AWS
- DigitalOcean

Just set your environment variables in your hosting dashboard.

## ❓ Troubleshooting

**Widget not loading?**
- Check console for errors
- Verify `appId` and `teamSlug` are correct
- Make sure `@ticketping/chat-widget` is installed

**Import errors?**
- Ensure you're using dynamic imports for client-side only code
- Check that the package is properly installed

That's it! The widget will appear in the bottom-right corner of your page.
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

/**
 * Ticketping Chat Widget component for Next.js
 * Uses the @ticketping/chat-widget npm package
 */
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
    // Only run on client side
    if (typeof window === 'undefined') return

    const loadWidget = async () => {
      try {
        // Dynamic import of the widget package (same as Svelte example)
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

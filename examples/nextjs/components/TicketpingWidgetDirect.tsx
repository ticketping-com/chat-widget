import { useEffect, useRef } from 'react'

interface TicketpingWidgetProps {
  appId?: string
  teamSlug?: string
  teamLogoIcon?: string
  apiBase?: string
  wsBase?: string
  userJWT?: string
  debug?: boolean
  analytics?: boolean
  theme?: any
  onReady?: () => void
  onError?: (error: any) => void
  onOpen?: () => void
  onClose?: () => void
  onMessageSent?: (message: any) => void
  onMessageReceived?: (message: any) => void
  onConversationStarted?: (id: string) => void
}

const lcsTheme = {
  // Light theme with bone & azure blue
  primaryColor: '#007BFF', // accent color
  primaryHover: '#0056b3', // slightly darker accent color
  textPrimary: '#1a202c', // bone.900 (main text)
  textSecondary: '#4a5568', // bone.700 (secondary text)
  textMuted: '#718096', // bone.600 (muted text)
  background: '#ffffff', // white
  backgroundSecondary: '#f7fafc', // bone.100
  backgroundTertiary: '#edf2f7', // bone.200
}

const TicketpingWidget: React.FC<TicketpingWidgetProps> = ({
  appId = 'lc-chat-widget',
  teamSlug = 'localcoinswap',
  teamLogoIcon = 'https://cdn.ticketping.com/cdn-cgi/imagedelivery/5r6ynTdZPDSnSrCrsat4pg/8eafda87-54f0-452a-e12b-86eef4927400/public',
  apiBase = 'https://api.ticketping.com',
  wsBase = 'wss://api.ticketping.com',
  userJWT,
  debug = false,
  analytics = true,
  onReady,
  onError,
  onOpen,
  onClose,
  onMessageSent,
  onMessageReceived,
  onConversationStarted,
}) => {
  const widgetRef = useRef<any>(null)
  const widgetReadyRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadWidget = async () => {
      try {
        // Dynamic import of the widget package
        await import('@ticketping/chat-widget')

        // @ts-ignore
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
          analytics,
          theme: lcsTheme,
          onReady: () => {
            widgetReadyRef.current = true
            onReady?.()
          },
          onOpen,
          onClose,
          onMessageSent,
          onMessageReceived,
          onConversationStarted,
          onError,
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

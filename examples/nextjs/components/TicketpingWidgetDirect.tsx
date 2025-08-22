import { useEffect, useRef } from 'react'

interface TicketpingWidgetProps {
  appId?: string
  teamSlug?: string
  teamLogoIcon?: string
  apiBase?: string
  wsBase?: string
  userJWT?: string
  debug?: boolean
  showPulseAnimation?: boolean
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
  primaryColor: '#007BFF', // azureblue.DEFAULT
  primaryButtonBg: '#007BFF', // azureblue.DEFAULT
  primaryButtonText: '#ffffff', // white
  primaryHover: '#0056b3', // darker azure blue for hover
  textPrimary: '#1a202c', // bone.900 (main text)
  textSecondary: '#4a5568', // bone.700 (secondary text)
  textMuted: '#718096', // bone.600 (muted text)
  textWhite: '#fff', // white
  background: '#ffffff', // white
  backgroundSecondary: '#f7fafc', // bone.100
  backgroundTertiary: '#edf2f7', // bone.200
  border: '#e2e8f0', // bone.300
  borderLight: '#cbd5e0', // bone.400
  borderCard: '#e2e8f0', // bone.300
  notificationBg: '#FFC806', // sunrise.DEFAULT
  successColor: '#21BA45', // forest.500
  offlineColor: '#a0aec0', // bone.500
  errorBg: '#f8d4d4', // cherry.300 (light background)
  errorText: '#c52424', // cherry.700 (dark text)
  errorBorder: '#e25353', // cherry.DEFAULT
  pulseColor: '#007BFF', // azureblue.DEFAULT
  shadowLight: 'rgba(26, 32, 44, 0.08)', // bone.900 with opacity
  shadowMedium: 'rgba(26, 32, 44, 0.15)', // bone.900 with opacity
  shadowDark: 'rgba(26, 32, 44, 0.25)', // bone.900 with opacity
  overlayLight: 'rgba(26, 32, 44, 0.05)', // bone.900 with opacity
}

const TicketpingWidget: React.FC<TicketpingWidgetProps> = ({
  appId = 'lc-chat-widget',
  teamSlug = 'localcoinswap',
  teamLogoIcon = 'https://cdn.ticketping.com/cdn-cgi/imagedelivery/5r6ynTdZPDSnSrCrsat4pg/8eafda87-54f0-452a-e12b-86eef4927400/public',
  apiBase = 'https://api.ticketping.com',
  wsBase = 'wss://api.ticketping.com',
  userJWT,
  debug = false,
  showPulseAnimation = true,
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
          showPulseAnimation,
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

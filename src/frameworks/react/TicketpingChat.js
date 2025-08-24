import { useEffect, useRef } from 'react';

/**
 * Ticketping Chat Widget component for React
 * Uses the @ticketping/chat-widget npm package
 */
const TicketpingChat = ({
  appId,
  teamSlug,
  teamLogoIcon,
  apiBase = 'https://api.ticketping.com',
  wsBase = 'wss://api.ticketping.com',
  userJWT,
  debug = false,
  analytics = true,
  theme,
  onReady = () => {},
  onError = (e) => {
    console.error('Ticketping Chat Widget error:', e);
  },
  onOpen = () => {},
  onClose = () => {},
  onMessageSent = () => {},
  onMessageReceived = () => {},
  onConversationStarted = () => {},
}) => {
  const widgetRef = useRef(null);
  const widgetReadyRef = useRef(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const loadWidget = async () => {
      try {
        // Dynamic import of the widget package
        await import('@ticketping/chat-widget');

        // Import CSS
        await import('@ticketping/chat-widget/style');

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
          theme,
          onReady: () => {
            widgetReadyRef.current = true;
            onReady?.();
          },
          onOpen,
          onClose,
          onMessageSent,
          onMessageReceived,
          onConversationStarted,
          onError,
        };

        // Initialize the widget
        widgetRef.current = window.TicketpingChat.init(config);
      } catch (error) {
        console.error('Failed to load Ticketping Chat Widget:', error);
        onError?.(error);
      }
    };

    loadWidget();

    // Cleanup on unmount
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
        widgetReadyRef.current = false;
      }
    };
  }, []); // Only run once on mount

  return null; // Widget renders itself into DOM
};

export default TicketpingChat;

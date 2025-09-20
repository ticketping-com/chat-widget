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
}) => {
  const widgetRef = useRef(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const loadWidget = async () => {
      try {
        // Dynamic import of the widget package
        await import('@ticketping/chat-widget');

        // @ts-ignore
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
        };

        // Initialize the widget
        widgetRef.current = window.TicketpingChat.init(config);
      } catch (error) {
        console.error('Failed to load Ticketping Chat Widget:', error);
      }
    };

    loadWidget();

    // Cleanup on unmount
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, []); // Only run once on mount

  return null; // Widget renders itself into DOM
};

export default TicketpingChat;

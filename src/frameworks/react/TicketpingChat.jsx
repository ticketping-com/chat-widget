import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const TicketpingChat = forwardRef(({
  appId = '',
  teamSlug = '',
  teamLogoIcon = '',
  apiBase = 'https://api.ticketping.com',
  wsBase = 'wss://api.ticketping.com',
  userJWT = '',
  debug = false,
  showPulseAnimation = true,
  analytics = true,
  theme = null,
  open = false
}, ref) => {
  const [widget, setWidget] = useState(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const configRef = useRef({});

  // Update config when props change
  useEffect(() => {
    configRef.current = {
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
    };
  }, [appId, teamSlug, teamLogoIcon, apiBase, wsBase, userJWT, debug, showPulseAnimation, analytics, theme]);

  // Handle open/close when prop changes
  useEffect(() => {
    if (widget && widgetReady) {
      if (open) {
        widget.open();
      } else {
        widget.close();
      }
    }
  }, [widget, widgetReady, open]);

  // Initialize widget on mount
  useEffect(() => {
    let isMounted = true;

    const initializeWidget = async () => {
      // Dynamic import to avoid SSR issues
      if (typeof window !== 'undefined') {
        try {
          // Import the widget
          await import('@ticketping/chat-widget');
          await import('@ticketping/chat-widget/style');

          if (!isMounted) {
            return; // Component was unmounted during import
          }

          // Initialize the widget
          const widgetInstance = window.TicketpingChat.init(configRef.current);
          setWidget(widgetInstance);
          setWidgetReady(true);

          // Open widget if prop is set
          if (open) {
            widgetInstance.open();
          }
        } catch (error) {
          console.error('Failed to load Ticketping Chat Widget:', error);
        }
      }
    };

    initializeWidget();

    // Cleanup function
    return () => {
      isMounted = false;
      if (widget) {
        widget.destroy();
        setWidget(null);
        setWidgetReady(false);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    openWidget: () => {
      if (widget && widgetReady) {
        widget.open();
      }
    },
    closeWidget: () => {
      if (widget && widgetReady) {
        widget.close();
      }
    },
    toggleWidget: () => {
      if (widget && widgetReady) {
        widget.toggle();
      }
    },
    startConversation: () => {
      if (widget && widgetReady) {
        return widget.startConversation();
      }
    },
    identifyUser: (userData) => {
      if (widget && widgetReady) {
        widget.identify(userData);
      }
    },
    isReady: () => {
      return widgetReady;
    }
  }), [widget, widgetReady]);

  // Render loading state if debug is enabled
  if (!widgetReady && debug) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      >
        Loading chat widget...
      </div>
    );
  }

  // The widget renders itself into the DOM, so this component doesn't need any markup
  return null;
});

TicketpingChat.displayName = 'TicketpingChat';

export default TicketpingChat;

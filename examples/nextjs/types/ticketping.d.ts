// Type definitions for Ticketping Chat Widget

declare module '@ticketping/chat-widget' {
  interface TicketpingConfig {
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
    onOpen?: () => void;
    onClose?: () => void;
    onMessageSent?: (message: any) => void;
    onMessageReceived?: (message: any) => void;
    onConversationStarted?: (id: string) => void;
    onError?: (error: any) => void;
  }

  const TicketpingChat: any;
  export default TicketpingChat;
}

declare module '@ticketping/chat-widget/style' {
  const styles: any;
  export default styles;
}

declare global {
  interface Window {
    TicketpingChat: {
      instance: any;
      init: (config: any) => any;
      identify: (userData: any) => void;
      open: () => void;
      close: () => void;
      startConversation: () => void;
      destroy: () => void;
      version: string;
    };
  }
}

export {}

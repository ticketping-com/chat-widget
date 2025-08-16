<script>
  import { onMount, onDestroy } from 'svelte'

  // Props - Configuration for the widget (Svelte 5 syntax)
  let {
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
    open = false,
    // Event handlers
    onready = () => {},
    onopen = () => {},
    onclose = () => {},
    onmessageSent = () => {},
    onmessageReceived = () => {},
    onconversationStarted = () => {},
    onerror = () => {}
  } = $props()

  let widget = $state(null)
  let widgetReady = $state(false)

  // Configuration object - derived from props
  const config = $derived({
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
    // Event callbacks that call the provided handlers
    onReady: () => {
      widgetReady = true
      onready()
    },
    onOpen: () => {
      onopen()
    },
    onClose: () => {
      onclose()
    },
    onMessageSent: (message) => {
      onmessageSent(message)
    },
    onMessageReceived: (message) => {
      onmessageReceived(message)
    },
    onConversationStarted: (id) => {
      onconversationStarted(id)
    },
    onError: (error) => {
      onerror(error)
    }
  })

  // Effect to handle open/close when prop changes
  $effect(() => {
    if (widget && widgetReady) {
      if (open) {
        widget.open()
      } else {
        widget.close()
      }
    }
  })

  onMount(async () => {
    // Dynamic import to avoid SSR issues
    if (typeof window !== 'undefined') {
      try {
        // Import the widget
        const TicketpingChat = await import('@ticketping/chat-widget')
        await import('@ticketping/chat-widget/style')

        // Initialize the widget
        widget = window.TicketpingChat.init(config)

        // Open widget if prop is set
        if (open) {
          widget.open()
        }
      } catch (error) {
        console.error('Failed to load Ticketping Chat Widget:', error)
        onerror(error)
      }
    }
  })

  onDestroy(() => {
    // Clean up widget when component is destroyed
    if (widget) {
      widget.destroy()
      widget = null
      widgetReady = false
    }
  })

  // Public methods that can be called from parent components
  export function openWidget() {
    if (widget && widgetReady) {
      widget.open()
    }
  }

  export function closeWidget() {
    if (widget && widgetReady) {
      widget.close()
    }
  }

  export function toggleWidget() {
    if (widget && widgetReady) {
      widget.toggle()
    }
  }

  export function startConversation() {
    if (widget && widgetReady) {
      return widget.startConversation()
    }
  }

  export function identifyUser(userData) {
    if (widget && widgetReady) {
      widget.identify(userData)
    }
  }

  export function isReady() {
    return widgetReady
  }
</script>

<!--
  The widget renders itself into the DOM, so this component doesn't need any markup.
  We could add a loading state or error state here if needed.
-->

{#if !widgetReady && debug}
  <div class="ticketping-loading" style="position: fixed; bottom: 20px; right: 20px; z-index: 999;">
    Loading chat widget...
  </div>
{/if}

<style>
  .ticketping-loading {
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
  }
</style>

import { getContext, setContext } from 'svelte'
import type { TicketpingApi } from '../api.ts'

/** The widget's state and actions for Svelte: `isOpen` and `unreadCount` are reactive. */
export interface TicketpingSvelte extends Omit<TicketpingApi, 'isOpen'> {
  readonly unreadCount: number
  readonly isOpen: boolean
}

const KEY = Symbol('ticketping')

/**
 * Wraps `client` with reactive `unreadCount` / `isOpen`. `connect()` subscribes to the widget's
 * events (call it after `init`) and returns the unsubscribe.
 */
export function bindTicketping(
  client: TicketpingApi
): TicketpingSvelte & { connect(): () => void } {
  let unreadCount = $state(0)
  let isOpen = $state(false)
  const refresh = () => {
    unreadCount = client.getUnreadCount()
    isOpen = client.isOpen()
  }

  return {
    get version() {
      return client.version
    },
    get unreadCount() {
      return unreadCount
    },
    get isOpen() {
      return isOpen
    },
    connect() {
      const offs = (['ready', 'open', 'close', 'unreadCountChange'] as const).map((event) =>
        client.on(event, refresh)
      )
      refresh()
      return () => {
        for (const off of offs) off()
      }
    },
    init: (options) => client.init(options),
    consent: (state) => client.consent(state),
    identify: (options) => client.identify(options),
    update: (options) => client.update(options),
    logout: () => client.logout(),
    open: () => client.open(),
    close: () => client.close(),
    toggle: () => client.toggle(),
    showLauncher: () => client.showLauncher(),
    hideLauncher: () => client.hideLauncher(),
    showNewMessage: (prefill) => client.showNewMessage(prefill),
    showConversation: (id) => client.showConversation(id),
    showSpace: (space) => client.showSpace(space),
    setLocale: (locale) => client.setLocale(locale),
    setContext: (attributes) => client.setContext(attributes),
    trackEvent: (name, meta) => client.trackEvent(name, meta),
    on: (event, handler) => client.on(event, handler),
    off: (event, handler) => client.off(event, handler),
    getUnreadCount: () => client.getUnreadCount(),
    preview: (options) => client.preview(options),
    destroy: () => client.destroy()
  }
}

export function provideTicketping(value: TicketpingSvelte): void {
  setContext(KEY, value)
}

/**
 * The widget's state and actions, for components rendered inside `<Ticketping>`. Elsewhere, pass
 * your own `createTicketping()` instance to `<Ticketping client={...}>` and call it directly.
 */
export function useTicketping(): TicketpingSvelte {
  const value = getContext<TicketpingSvelte | undefined>(KEY)
  if (!value) throw new Error('useTicketping() must be used inside <Ticketping>.')
  return value
}

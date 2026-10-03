import { inject, reactive, type App, type InjectionKey, type Plugin } from 'vue'
import type { InitOptions } from '@ticketping/core'
import type { TicketpingApi } from './api.ts'
import { createClient } from './client.ts'

export type { GetToken, TicketpingUser, UserInput } from './adapters/user-sync.ts'

export interface TicketpingVue extends Omit<TicketpingApi, 'isOpen'> {
  unreadCount: number
  isOpen: boolean
}

const KEY: InjectionKey<TicketpingVue> = Symbol('ticketping')

function bind(client: TicketpingApi): TicketpingVue {
  const snapshot = reactive({ unreadCount: 0, isOpen: false })
  const refresh = () => {
    snapshot.unreadCount = client.getUnreadCount()
    snapshot.isOpen = client.isOpen()
  }
  for (const event of ['ready', 'open', 'close', 'unreadCountChange'] as const) {
    client.on(event, refresh)
  }
  refresh()
  return {
    get version() {
      return client.version
    },
    get unreadCount() {
      return snapshot.unreadCount
    },
    get isOpen() {
      return snapshot.isOpen
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

/**
 * `app.use(TicketpingPlugin, { publishableKey })`. Safe during SSR: `init` waits until a window
 * exists. Use `useTicketping()` in components.
 */
export const TicketpingPlugin: Plugin<InitOptions> = {
  install(app: App, options: InitOptions) {
    const client = createClient({ version: __VERSION__, integration: 'vue' })
    const api = bind(client)
    if (typeof document !== 'undefined') client.init({ ...options, integration: 'vue' })
    app.provide(KEY, api)
  }
}

/** The widget's state and actions. Must be used after `app.use(TicketpingPlugin)`. */
export function useTicketping(): TicketpingVue {
  const value = inject(KEY)
  if (!value) throw new Error('useTicketping() must be used after app.use(TicketpingPlugin).')
  return value
}

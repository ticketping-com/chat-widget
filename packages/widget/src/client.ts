import {
  createWidgetController,
  type Platform,
  type WidgetController,
  type WidgetEventName,
  type WidgetState
} from '@ticketping/core'
import { mountWidget, type MountedWidget } from '@ticketping/ui'
import type { EventHandler, TicketpingApi } from './api.ts'

export interface ClientOptions {
  version: string
  /** `script`, `npm`, `react`, `vue` or `svelte`; sent in `X-Ticketping-Client`. */
  integration: string
  /** Browser globals; tests pass fakes. */
  platform?: Platform
}

/** The public API plus the controller, for adapters and the playground. */
export interface TicketpingClient extends TicketpingApi {
  readonly controller: WidgetController
}

const rendered = (state: WidgetState) => state.status === 'ready' || state.status === 'preview'

/** Safe to call during SSR: nothing touches `window` or the DOM until `init()` or `preview()`. */
export function createClient({ version, integration, platform }: ClientOptions): TicketpingClient {
  const controller = createWidgetController(
    platform ? { version, integration, platform } : { version, integration }
  )
  let mounted: MountedWidget | undefined
  let unsubscribe: (() => void) | undefined
  let ready = false

  function watch() {
    if (unsubscribe || typeof document === 'undefined') return
    // The host element only exists while there is something to show: never before consent or after a failed boot.
    unsubscribe = controller.subscribe((state) => {
      if (rendered(state) && !mounted) mounted = mountWidget({ controller })
      else if (!rendered(state) && mounted) unmount()
    })
  }

  function unmount() {
    mounted?.destroy()
    mounted = undefined
  }

  function trackReady() {
    controller.events.on('ready', () => (ready = true))
  }
  trackReady()

  const api: TicketpingApi = {
    version,

    init(options) {
      watch()
      controller.init(options)
    },
    consent: (state) => controller.consent(state),
    identify: (options) => controller.identify(options),
    update: (options) => controller.update(options),
    logout: () => controller.logout(),

    open: () => controller.open(),
    close: () => controller.close(),
    toggle: () => controller.toggle(),
    showLauncher: () => controller.showLauncher(),
    hideLauncher: () => controller.hideLauncher(),
    showNewMessage: (prefill) => controller.showNewMessage(prefill),
    showConversation: (id) => controller.showConversation(id),
    showSpace(space) {
      if (space === 'messages') controller.showMessages()
      else controller.showHome()
    },

    setLocale: (locale) => controller.setLocale(locale),
    setContext: (attributes) => controller.setContext(attributes),
    trackEvent: (name, meta) => controller.trackEvent(name, meta),

    on<K extends WidgetEventName>(event: K, handler: EventHandler<K>) {
      const off = controller.events.on(event, handler)
      // `ready` is a state, not just a moment: late subscribers still get it once.
      if (event === 'ready' && ready) {
        queueMicrotask(() => (handler as () => void)())
      }
      return off
    },
    off: (event, handler) => controller.events.off(event, handler),

    getUnreadCount: () => controller.getState().unreadCount,
    isOpen: () => controller.getState().open,

    preview(options) {
      watch()
      controller.preview(options)
    },

    destroy() {
      unsubscribe?.()
      unsubscribe = undefined
      unmount()
      controller.destroy()
      ready = false
      trackReady()
    }
  }

  // Not enumerable, so `createGlobal` does not copy it onto `window.Ticketping`.
  return Object.defineProperty(api, 'controller', { value: controller }) as TicketpingClient
}

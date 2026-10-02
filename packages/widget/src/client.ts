import {
  createEmitter,
  createStore,
  resolveConfig,
  type InitOptions,
  type WidgetEvents,
  type WidgetState
} from '@ticketping/core'
import { mountWidget, type MountedWidget } from '@ticketping/ui'
import type { TicketpingApi } from './api.ts'

const KEY_PATTERN = /^pk_[A-Za-z0-9]{24}$/

export function createClient(version: string): TicketpingApi {
  const events = createEmitter<WidgetEvents>()
  const store = createStore<WidgetState>({
    open: false,
    launcherVisible: true,
    unreadCount: 0,
    position: 'bottom-right',
    colorMode: 'auto'
  })

  let options: InitOptions | undefined
  let mounted: MountedWidget | undefined

  function start() {
    if (mounted || typeof document === 'undefined') return
    mounted = mountWidget({ store, onLauncherClick: () => api.toggle() })
    events.emit('ready', undefined)
  }

  function teardown() {
    mounted?.destroy()
    mounted = undefined
    store.set({ open: false })
  }

  function fail(code: string, message: string) {
    console.error(`[Ticketping] ${message}`)
    events.emit('error', { code, message })
  }

  function setOpen(open: boolean) {
    if (!options || store.get().open === open) return
    store.set({ open })
    events.emit(open ? 'open' : 'close', undefined)
  }

  const api: TicketpingApi = {
    version,

    init(next) {
      if (options) {
        console.warn('[Ticketping] init() was already called; ignoring the second call.')
        return
      }
      if (!next || !KEY_PATTERN.test(next.publishableKey ?? '')) {
        fail(
          'invalid_publishable_key',
          'init() needs the publishableKey ("pk_...") shown in the dashboard.'
        )
        return
      }
      options = next
      // Until boot exists (M3), code options resolve against the built-in defaults.
      const { appearance, ignoredFeatureOverrides } = resolveConfig(undefined, next)
      if (ignoredFeatureOverrides.length > 0) {
        console.warn(
          `[ticketping] ${ignoredFeatureOverrides.join(', ')} can only be switched on in the dashboard; ignoring.`
        )
      }
      store.set({
        position: appearance.position,
        colorMode: appearance.colorMode,
        launcherVisible: !next.hideLauncher
      })
      if ((next.consent ?? 'granted') === 'granted') start()
    },

    consent(state) {
      if (!options) return
      if (state === 'granted') start()
      else teardown()
    },

    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!store.get().open),
    showLauncher: () => store.set({ launcherVisible: true }),
    hideLauncher: () => store.set({ launcherVisible: false }),
    isOpen: () => store.get().open,
    getUnreadCount: () => store.get().unreadCount,
    on(event, handler) {
      const off = events.on(event, handler)
      // `ready` is a state, not just a moment: late subscribers still get it once.
      if (event === 'ready' && mounted) {
        queueMicrotask(() => (handler as () => void)())
      }
      return off
    },
    off: (event, handler) => events.off(event, handler),

    destroy() {
      teardown()
      options = undefined
      events.clear()
    }
  }

  return api
}

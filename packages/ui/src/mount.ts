import type { Store, WidgetState } from '@ticketping/core'
import { mount, unmount } from 'svelte'
import App from './App.svelte'
import { baseStyles } from './base-styles.ts'

export const HOST_TAG = 'ticketping-widget'

export interface MountOptions {
  store: Store<WidgetState>
  onLauncherClick: () => void
  /** Defaults to `document.body`. */
  container?: HTMLElement
}

export interface MountedWidget {
  host: HTMLElement
  destroy(): void
}

export function mountWidget({ store, onLauncherClick, container }: MountOptions): MountedWidget {
  const host = document.createElement(HOST_TAG)
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = baseStyles
  shadow.append(style)

  const unsubscribe = store.subscribe((state) => {
    host.dataset.position = state.position
    host.dataset.colorMode = resolveColorMode(state.colorMode)
  })

  ;(container ?? document.body).append(host)
  const app = mount(App, { target: shadow, props: { store, onLauncherClick } })

  return {
    host,
    destroy() {
      unsubscribe()
      void unmount(app)
      host.remove()
    }
  }
}

function resolveColorMode(mode: WidgetState['colorMode']): 'light' | 'dark' {
  if (mode !== 'auto') return mode
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

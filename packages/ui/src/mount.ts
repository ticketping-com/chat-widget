import type { WidgetController, WidgetState } from '@ticketping/core'
import { mount, unmount } from 'svelte'
import App from './App.svelte'
import { baseStyles } from './base-styles.ts'
import { paintAccent } from './color.ts'
import { applyMobileFrame, CLOSE_HOLD_MS, watchMobileFrame } from './lib/viewport.ts'

export const HOST_TAG = 'ticketping-widget'

export interface MountOptions {
  controller: WidgetController
  /** Defaults to `document.body`. */
  container?: HTMLElement
}

export interface MountedWidget {
  host: HTMLElement
  destroy(): void
}

export function mountWidget({ controller, container }: MountOptions): MountedWidget {
  const host = document.createElement(HOST_TAG)
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = baseStyles
  shadow.append(style)

  const dark = window.matchMedia?.('(prefers-color-scheme: dark)')
  let hideLauncherHold = 0
  const clearHideLauncher = () => {
    window.clearTimeout(hideLauncherHold)
    hideLauncherHold = 0
    delete host.dataset.hideLauncher
  }
  const applyHideLauncher = (state: WidgetState) => {
    const hideWhenOpen = state.config.appearance.launcher.hideWhenOpen
    if (hideWhenOpen && state.open) {
      window.clearTimeout(hideLauncherHold)
      hideLauncherHold = 0
      host.dataset.hideLauncher = 'true'
      return
    }
    // Keep the corner layout through the exit so the panel does not jump up onto the launcher.
    if (hideWhenOpen && host.dataset.hideLauncher === 'true') {
      if (hideLauncherHold) return
      const reduce =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      hideLauncherHold = window.setTimeout(clearHideLauncher, reduce ? 0 : CLOSE_HOLD_MS)
      return
    }
    clearHideLauncher()
  }
  const apply = (state: WidgetState) => {
    const { appearance } = state.config
    host.dataset.position = appearance.position
    const colorMode = resolveColorMode(appearance.colorMode, dark?.matches ?? false)
    const ink = paintAccent(appearance.accentColor, colorMode)
    host.dataset.colorMode = colorMode
    host.dataset.open = String(state.open)
    applyHideLauncher(state)
    host.style.setProperty('--tp-accent', ink.accent)
    host.style.setProperty('--tp-on-accent', ink.onAccent)
    host.hidden = !state.launcherVisible && !state.open
    applyMobileFrame(host, state.open)
  }
  const unsubscribe = controller.subscribe(apply)
  const stopViewport = watchMobileFrame(host, () => controller.getState().open)
  const onScheme = () => apply(controller.getState())
  dark?.addEventListener?.('change', onScheme)

  ;(container ?? document.body).append(host)
  const app = mount(App, { target: shadow, props: { controller } })

  return {
    host,
    destroy() {
      unsubscribe()
      stopViewport()
      clearHideLauncher()
      dark?.removeEventListener?.('change', onScheme)
      void unmount(app)
      host.remove()
    }
  }
}

function resolveColorMode(mode: 'light' | 'dark' | 'auto', prefersDark: boolean): 'light' | 'dark' {
  if (mode !== 'auto') return mode
  return prefersDark ? 'dark' : 'light'
}

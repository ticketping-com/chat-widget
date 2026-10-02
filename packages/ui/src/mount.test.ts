import { createStore, type WidgetState } from '@ticketping/core'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOST_TAG, mountWidget, type MountedWidget } from './mount.ts'

const initial: WidgetState = {
  open: false,
  launcherVisible: true,
  unreadCount: 0,
  position: 'bottom-right',
  colorMode: 'light'
}

let widget: MountedWidget | undefined

afterEach(() => {
  widget?.destroy()
  widget = undefined
})

describe('mountWidget', () => {
  it('renders the launcher inside an open shadow root, not in the host document', () => {
    widget = mountWidget({ store: createStore(initial), onLauncherClick: () => {} })

    const host = document.querySelector(HOST_TAG)
    expect(host).toBe(widget.host)
    expect(document.querySelector('button')).toBeNull()
    expect(host?.shadowRoot?.querySelector('button.launcher')).not.toBeNull()
    expect(document.head.querySelector('style')).toBeNull()
  })

  it('reflects store state and forwards clicks', () => {
    const store = createStore(initial)
    const onLauncherClick = vi.fn()
    widget = mountWidget({ store, onLauncherClick })
    const button = () => widget!.host.shadowRoot!.querySelector('button')!

    button().click()
    expect(onLauncherClick).toHaveBeenCalledOnce()

    store.set({ open: true, position: 'bottom-left' })
    flushSync()
    expect(button().getAttribute('aria-expanded')).toBe('true')
    expect(button().getAttribute('aria-label')).toBe('Close chat')
    expect(widget.host.dataset.position).toBe('bottom-left')

    store.set({ open: false, unreadCount: 3 })
    flushSync()
    expect(button().getAttribute('aria-label')).toBe('Open chat, 3 unread messages')
    expect(button().querySelector('.badge')?.textContent).toBe('3')

    store.set({ launcherVisible: false })
    flushSync()
    expect(widget.host.shadowRoot!.querySelector('button')).toBeNull()
  })

  it('removes everything on destroy', () => {
    widget = mountWidget({ store: createStore(initial), onLauncherClick: () => {} })
    widget.destroy()
    widget = undefined
    expect(document.querySelector(HOST_TAG)).toBeNull()
  })
})

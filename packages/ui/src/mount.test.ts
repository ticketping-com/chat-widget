import { createWidgetController, type WidgetController } from '@ticketping/core'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { onAccent, paintAccent } from './color.ts'
import { HOST_TAG, mountWidget, type MountedWidget } from './mount.ts'

let widget: MountedWidget | undefined
let controller: WidgetController

function setup(): { shadow: ShadowRoot; launcher: () => HTMLButtonElement | null } {
  controller = createWidgetController({ version: 'test' })
  controller.preview({ config: { team: { name: 'Acme' }, appearance: { accentColor: '#000000' } } })
  controller.close()
  widget = mountWidget({ controller })
  flushSync()
  const shadow = widget.host.shadowRoot as ShadowRoot
  return { shadow, launcher: () => shadow.querySelector<HTMLButtonElement>('button.launcher') }
}

afterEach(() => {
  widget?.destroy()
  widget = undefined
  controller.destroy()
})

describe('mountWidget', () => {
  it('renders inside an open shadow root, not in the host document', () => {
    const { shadow } = setup()
    expect(document.querySelector(HOST_TAG)).toBe(widget?.host)
    expect(document.querySelector('button')).toBeNull()
    expect(shadow.querySelector('button.launcher')).not.toBeNull()
    expect(document.head.querySelector('style')).toBeNull()
  })

  it('renders nothing until the widget is ready', () => {
    controller = createWidgetController({ version: 'test' })
    widget = mountWidget({ controller })
    flushSync()
    expect(widget.host.shadowRoot?.querySelector('.tp-root')).toBeNull()
  })

  it('toggles the panel from the launcher and closes it with Escape', () => {
    const { shadow, launcher } = setup()
    launcher()?.click()
    flushSync()
    expect(controller.getState().open).toBe(true)
    expect(launcher()?.getAttribute('aria-expanded')).toBe('true')
    expect(launcher()?.getAttribute('aria-label')).toBe('Close chat')
    const dialog = shadow.querySelector('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Chat with Acme')
    expect(shadow.activeElement).toBe(dialog)

    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flushSync()
    expect(controller.getState().open).toBe(false)
    expect(shadow.querySelector('[role="dialog"]')?.getAttribute('data-open')).toBe('false')
  })

  it('reflects config, unread count, launcher visibility and direction', () => {
    const { shadow, launcher } = setup()
    const host = widget?.host as HTMLElement
    expect(host.dataset.position).toBe('bottom-right')
    expect(host.style.getPropertyValue('--tp-accent')).toBe('#000000')
    expect(host.style.getPropertyValue('--tp-on-accent')).toBe('#fff')

    controller.update({ appearance: { position: 'bottom-left', colorMode: 'dark' } })
    flushSync()
    expect(host.dataset.position).toBe('bottom-left')
    expect(host.dataset.colorMode).toBe('dark')
    expect(host.style.getPropertyValue('--tp-accent')).toBe('#fff')
    expect(host.style.getPropertyValue('--tp-on-accent')).toBe('#171717')

    controller.setLocale('ar')
    flushSync()
    expect(shadow.querySelector('.tp-root')?.getAttribute('dir')).toBe('rtl')

    controller.hideLauncher()
    flushSync()
    expect(launcher()).toBeNull()
    expect(host.hidden).toBe(true)
    controller.showLauncher()
    flushSync()
    expect(host.hidden).toBe(false)
  })

  it('renders the home greeting and a preview thread without flicker state', () => {
    const { shadow, launcher } = setup()
    launcher()?.click()
    flushSync()
    expect(shadow.textContent).toContain('Hi there 👋')
    expect(shadow.textContent).toContain('How can we help you?')
    expect(shadow.querySelector('textarea')).toBeNull()

    controller.showNewMessage()
    flushSync()
    expect(shadow.querySelector('textarea')?.getAttribute('placeholder')).toBe('Type a message...')
    expect(shadow.textContent).toContain('Hi, how can I help you today?')
    expect(shadow.textContent).toContain('Acme')

    controller.preview({
      config: { team: { name: 'Acme' }, appearance: { accentColor: '#000000' } },
      view: 'thread'
    })
    flushSync()
    expect(shadow.querySelector('[data-view="thread"]')).not.toBeNull()
    expect(shadow.textContent).toContain("I can't find where to export")
    expect(shadow.textContent).toContain('Handed over to the team')
  })

  it('removes everything on destroy', () => {
    setup()
    widget?.destroy()
    widget = undefined
    expect(document.querySelector(HOST_TAG)).toBeNull()
  })
})

describe('paintAccent', () => {
  it('keeps a neutral starter black in light and white in dark', () => {
    expect(paintAccent('#171717', 'light')).toEqual({ accent: '#171717', onAccent: '#fff' })
    expect(paintAccent('#000000', 'dark')).toEqual({ accent: '#fff', onAccent: '#171717' })
    expect(paintAccent('#ffffff', 'light').accent).toBe('#171717')
  })

  it('leaves a brand color that still contrasts', () => {
    expect(paintAccent('#3B82F6', 'dark').accent).toBe('#3B82F6')
    expect(paintAccent('#3B82F6', 'light').accent).toBe('#3B82F6')
  })
})

describe('onAccent', () => {
  it('picks readable text for the accent', () => {
    expect(onAccent('#ffffff')).not.toBe('#fff')
    expect(onAccent('#a3e635')).not.toBe('#fff')
    expect(onAccent('#1e3a8a')).toBe('#fff')
    expect(onAccent('#3B82F6')).toBe('#fff')
    expect(onAccent('#000')).toBe('#fff')
    expect(onAccent('red')).not.toBe('#fff')
  })
})

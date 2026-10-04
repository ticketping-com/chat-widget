import { createWidgetController, type WidgetController } from '@ticketping/core'
import { PK, conversation, createFakeEnv, flush, installBackend, message } from '@ticketping/core/testing'
import { flushSync } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  controller?.destroy()
  vi.useRealTimers()
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
    expect(launcher()?.dataset.icon).toBe('chat')
    expect(launcher()?.querySelector('.icon-face')).not.toBeNull()

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

  it('renders the dashboard launcher icon and label', () => {
    const { launcher } = setup()
    expect(launcher()?.dataset.icon).toBe('chat')
    expect(launcher()?.dataset.labeled).toBe('false')
    expect(launcher()?.querySelector('.caption')).toBeNull()

    controller.preview({
      config: { appearance: { launcher: { icon: 'help', label: 'Support' } } },
      view: 'launcher'
    })
    flushSync()
    expect(launcher()?.dataset.icon).toBe('help')
    expect(launcher()?.dataset.labeled).toBe('true')
    expect(launcher()?.querySelector('.caption')?.textContent).toBe('Support')
    expect(launcher()?.querySelector('.icon-face')).not.toBeNull()

    controller.preview({
      config: { appearance: { launcher: { icon: 'none', label: 'Chat with us' } } },
      view: 'launcher'
    })
    flushSync()
    expect(launcher()?.dataset.icon).toBe('none')
    expect(launcher()?.querySelector('.icon-face')).toBeNull()
    expect(launcher()?.querySelector('.caption')?.textContent).toBe('Chat with us')

    launcher()?.click()
    flushSync()
    expect(launcher()?.querySelector('.caption')).toBeNull()
  })

  it('renders the home greeting and a preview thread without flicker state', async () => {
    const { shadow, launcher } = setup()
    launcher()?.click()
    flushSync()
    expect(shadow.textContent).toContain('Hi there 👋')
    expect(shadow.textContent).toContain('How can we help you?')
    expect(shadow.querySelector('textarea')).toBeNull()

    controller.showNewMessage()
    flushSync()
    await Promise.resolve()
    expect(shadow.querySelector('textarea')?.getAttribute('placeholder')).toBe('Type a message...')
    expect(shadow.activeElement).toBe(shadow.querySelector('textarea'))
    expect(shadow.textContent).toContain('Hi, how can I help you today?')
    expect(shadow.textContent).toContain('Acme')

    const textarea = shadow.querySelector('textarea')
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setValue?.call(textarea, 'Hello')
    textarea?.dispatchEvent(new Event('input', { bubbles: true }))
    flushSync()
    shadow.querySelector<HTMLButtonElement>('button.send')?.click()
    flushSync()
    expect(shadow.activeElement).toBe(textarea)

    controller.preview({
      config: { team: { name: 'Acme' }, appearance: { accentColor: '#000000' } },
      view: 'thread'
    })
    flushSync()
    expect(shadow.querySelector('[data-view="thread"]')).not.toBeNull()
    expect(shadow.textContent).toContain("I can't find where to export")
    expect(shadow.textContent).not.toContain('A teammate will take it from here')

    controller.preview({
      config: { team: { name: 'Acme' }, features: { ai: true } },
      view: 'thread'
    })
    flushSync()
    expect(shadow.textContent).toContain('A teammate will take it from here')
  })

  it('clusters consecutive bubbles from the same sender', () => {
    const { shadow, launcher } = setup()
    launcher()?.click()
    flushSync()
    controller.showNewMessage()
    flushSync()
    controller.send({ conversationId: null, text: 'First' })
    controller.send({ conversationId: null, text: 'Second' })
    flushSync()
    const mine = [...shadow.querySelectorAll('[data-sender="USER"]')]
    expect(mine).toHaveLength(2)
    expect(mine[0]?.classList.contains('joins-next')).toBe(true)
    expect(mine[0]?.classList.contains('joins-prev')).toBe(false)
    expect(mine[1]?.classList.contains('joins-prev')).toBe(true)
    expect(mine[1]?.classList.contains('joins-next')).toBe(false)
  })

  it('keeps the new-chat greeting after send and shows typing dots while waiting', async () => {
    vi.useFakeTimers()
    const env = createFakeEnv()
    installBackend(env)
    controller = createWidgetController({ version: 'test', platform: env.platform })
    widget = mountWidget({ controller })
    controller.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    for (let i = 0; i < 5; i++) {
      await flush()
      await vi.advanceTimersByTimeAsync(0)
    }
    const socket = env.socket()
    socket.open()
    socket.push('auth.ok', {
      visitorId: 'vi_1',
      identity: { state: 'anonymous', userId: null, name: null, email: null, contactEmail: null },
      cursor: 'c1'
    })
    flushSync()
    controller.open()
    controller.showNewMessage()
    flushSync()

    const shadow = widget.host.shadowRoot as ShadowRoot
    expect(shadow.textContent).toContain('Hi, how can I help you today?')
    const clientId = controller.send({ conversationId: null, text: 'Hello' })
    socket.push('ack', {
      clientId,
      message: message('cm_1', {
        clientId,
        conversationId: 'cs_new',
        sender: { type: 'USER' },
        createdAt: '2026-05-01T10:00:00.000Z',
        body: { format: 'text', content: 'Hello' }
      }),
      conversation: conversation('cs_new', { updatedAt: '2026-05-01T10:00:00.000Z', phase: 'ai' })
    })
    flushSync()
    expect(shadow.textContent).toContain('Hi, how can I help you today?')
    expect(shadow.textContent).toContain('Hello')
    expect(shadow.querySelector('.typing')).toBeNull()

    await vi.advanceTimersByTimeAsync(2_000)
    flushSync()
    expect(shadow.querySelector('.typing')).not.toBeNull()
  })

  it('does not replay the send animation when the server acks the same message', async () => {
    vi.useFakeTimers()
    const env = createFakeEnv()
    installBackend(env)
    controller = createWidgetController({ version: 'test', platform: env.platform })
    widget = mountWidget({ controller })
    controller.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    for (let i = 0; i < 5; i++) {
      await flush()
      await vi.advanceTimersByTimeAsync(0)
    }
    const socket = env.socket()
    socket.open()
    socket.push('auth.ok', {
      visitorId: 'vi_1',
      identity: { state: 'anonymous', userId: null, name: null, email: null, contactEmail: null },
      cursor: 'c1'
    })
    flushSync()
    controller.open()
    controller.showNewMessage()
    flushSync()

    const shadow = widget.host.shadowRoot as ShadowRoot
    const clientId = controller.send({ conversationId: null, text: 'Hello' })
    flushSync()
    const outgoing = shadow.querySelector('[data-sender="USER"]')
    expect(outgoing?.classList.contains('arrive')).toBe(true)
    expect(outgoing?.getAttribute('data-delivery')).toBe('sending')

    socket.push('ack', {
      clientId,
      message: message('cm_1', {
        clientId,
        conversationId: 'cs_new',
        sender: { type: 'USER' },
        createdAt: '2026-05-01T10:00:00.000Z',
        body: { format: 'text', content: 'Hello' }
      }),
      conversation: conversation('cs_new', { updatedAt: '2026-05-01T10:00:00.000Z', phase: 'ai' })
    })
    flushSync()
    const acked = shadow.querySelector('[data-sender="USER"]')
    expect(acked).toBe(outgoing)
    expect(acked?.classList.contains('arrive')).toBe(true)
    expect(acked?.getAttribute('data-delivery')).toBe('sent')
    expect(acked?.textContent).toContain('Hello')
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

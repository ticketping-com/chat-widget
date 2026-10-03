import { browserPlatform } from '@ticketping/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createTabTitle,
  decorateTitle,
  tabAlert,
  tabCountLabel,
  tabTitleFrame
} from './tab-title.ts'

describe('tab title text', () => {
  it('prefixes the page title and caps the count', () => {
    expect(tabCountLabel(0, String)).toBeNull()
    expect(tabCountLabel(3, (n) => String(n))).toBe('3')
    expect(tabCountLabel(120, (n) => String(n))).toBe('99+')
    expect(decorateTitle('Inbox', '1')).toBe('(1) Inbox')
    expect(decorateTitle('', '2')).toBe('(2)')
  })

  it('clips a long preview and falls back when there is none', () => {
    expect(tabAlert('', 'New message')).toBe('New message')
    expect(tabAlert('  Hello   there  ', 'New message')).toBe('Hello there')
    expect(tabAlert('x'.repeat(90), 'New message')).toBe(`${'x'.repeat(79)}…`)
  })

  it('holds the prefix on a visible tab and flashes the alert on a hidden one', () => {
    const frame = { base: 'Inbox', countLabel: '1', alert: 'Hello', reduceMotion: false }
    expect(tabTitleFrame({ ...frame, hidden: false, phase: 1 })).toBe('(1) Inbox')
    expect(tabTitleFrame({ ...frame, hidden: true, phase: 0 })).toBe('(1) Inbox')
    expect(tabTitleFrame({ ...frame, hidden: true, phase: 1 })).toBe('(1) Hello')
    expect(tabTitleFrame({ ...frame, hidden: true, phase: 1, reduceMotion: true })).toBe(
      '(1) Inbox'
    )
    expect(tabTitleFrame({ ...frame, countLabel: null, hidden: true, phase: 1 })).toBe('Inbox')
  })
})

describe('createTabTitle', () => {
  afterEach(() => {
    document.title = ''
    vi.useRealTimers()
  })

  it('prefixes while unread, keeps the real title for page context, and restores', () => {
    document.title = 'Inbox'
    const titles = createTabTitle(document)
    titles.update({ active: true, countLabel: '1', alert: 'Hello' })
    expect(document.title).toBe('(1) Inbox')
    expect(browserPlatform().page().title).toBe('Inbox')

    document.title = 'Billing'
    titles.update({ active: true, countLabel: '2', alert: 'Hello' })
    expect(document.title).toBe('(2) Billing')
    expect(browserPlatform().page().title).toBe('Billing')

    titles.update({ active: false, countLabel: null, alert: '' })
    expect(document.title).toBe('Billing')
    expect(browserPlatform().page().title).toBe('Billing')
    titles.destroy()
  })

  it('flashes the alert while the tab is hidden', () => {
    vi.useFakeTimers()
    document.title = 'Inbox'
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const titles = createTabTitle(document)
    titles.update({ active: true, countLabel: '1', alert: 'Hello' })
    expect(document.title).toBe('(1) Inbox')
    vi.advanceTimersByTime(1000)
    expect(document.title).toBe('(1) Hello')
    vi.advanceTimersByTime(1000)
    expect(document.title).toBe('(1) Inbox')
    titles.destroy()
    expect(document.title).toBe('Inbox')
    visibility.mockRestore()
  })
})

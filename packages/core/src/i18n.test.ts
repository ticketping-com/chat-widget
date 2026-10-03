import { describe, expect, it } from 'vitest'
import { en } from './catalog.ts'
import { createI18n, eventText, messagePreview, textDirection } from './i18n.ts'
import type { Message } from './types.ts'

const message = (patch: Partial<Message>): Message => ({
  id: 'cm_1',
  conversationId: 'cs_1',
  createdAt: '2026-01-01T00:00:00.000Z',
  sender: { type: 'AGENT', name: 'Grace' },
  kind: 'message',
  body: { format: 'markdown', content: 'Hello' },
  attachments: [],
  event: null,
  ...patch
})

describe('createI18n', () => {
  const i18n = createI18n({ locale: 'en-US' })

  it('interpolates params and picks plural forms', () => {
    expect(i18n.t('thread.typing', { name: 'Grace' })).toBe('Grace is typing...')
    expect(i18n.t('launcher.openUnread', { count: 1 })).toBe('Open chat, 1 unread message')
    expect(i18n.t('launcher.openUnread', { count: 1200 })).toBe('Open chat, 1,200 unread messages')
  })

  it('lets texts override any key', () => {
    const custom = createI18n({
      locale: 'en',
      texts: { greetingTitle: 'Hey {name}', 'handoff.button': 'Talk to Grace' }
    })
    expect(custom.t('greetingTitle', { name: 'Ada' })).toBe('Hey Ada')
    expect(custom.t('handoff.button')).toBe('Talk to Grace')
    expect(custom.t('composerPlaceholder')).toBe(en.composerPlaceholder)
  })

  it('derives direction from the locale', () => {
    expect(textDirection('ar-EG')).toBe('rtl')
    expect(textDirection('he')).toBe('rtl')
    expect(textDirection('fa_IR')).toBe('rtl')
    expect(textDirection('en-GB')).toBe('ltr')
    expect(createI18n({ locale: 'ar' }).dir).toBe('rtl')
  })

  it('falls back to English for an invalid locale', () => {
    expect(createI18n({ locale: 'not a locale!!' }).locale).toBe('en')
  })

  it('formats relative times, days and sizes', () => {
    const now = Date.parse('2026-03-10T12:00:00Z')
    expect(i18n.formatRelative(now - 10_000, now)).toBe('Just now')
    expect(i18n.formatRelative(now - 6 * 60_000, now)).toBe('6m')
    expect(i18n.formatRelative(now - 3 * 3_600_000, now)).toBe('3h')
    expect(i18n.formatRelative(now - 3_600_000, now)).toBe('1h')
    expect(i18n.formatRelative(now - 86_400_000, now)).toBe('1d')
    expect(i18n.formatRelative(now - 30 * 86_400_000, now)).toBe('Feb 8')
    expect(i18n.formatDay(now, now)).toBe('Today')
    expect(i18n.formatDay(now - 86_400_000, now)).toBe('Yesterday')
    expect(i18n.formatFileSize(512)).toBe('512 B')
    expect(i18n.formatFileSize(48213)).toBe('47.1 KB')
    expect(i18n.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('has every catalog entry as a non-empty string or plural form', () => {
    for (const [key, value] of Object.entries(en)) {
      const text = typeof value === 'string' ? value : value.other
      expect(text, key).toBeTruthy()
    }
  })
})

describe('messagePreview', () => {
  const i18n = createI18n({ locale: 'en' })

  it('uses text, then GIF and attachment labels (protocol 7.1)', () => {
    expect(messagePreview(message({}), i18n)).toBe('Hello')
    expect(
      messagePreview(
        message({
          sender: { type: 'USER' },
          body: { format: 'text', content: '' },
          attachments: [
            {
              id: 'ca_1',
              kind: 'gif',
              gif: {
                provider: 'giphy',
                id: 'g',
                title: 'Thumbs up',
                width: 1,
                height: 1,
                mp4Url: '',
                webpUrl: '',
                gifUrl: '',
                stillUrl: ''
              }
            }
          ]
        }),
        i18n
      )
    ).toBe('You: GIF: Thumbs up')
    expect(
      messagePreview(
        message({
          body: null,
          attachments: [
            {
              id: 'a',
              kind: 'file',
              name: 'a.pdf',
              size: 1,
              contentType: 'application/pdf',
              isImage: false,
              url: ''
            },
            {
              id: 'b',
              kind: 'file',
              name: 'b.pdf',
              size: 1,
              contentType: 'application/pdf',
              isImage: false,
              url: ''
            }
          ]
        }),
        i18n
      )
    ).toBe('2 attachments')
    expect(messagePreview(null, i18n)).toBe('')
  })

  it('renders event messages and unknown formats', () => {
    const status = { slug: 'done', label: 'Done', theme: 'GREEN' as const }
    expect(
      eventText(message({ kind: 'event', event: { type: 'status_changed', status } }), i18n)
    ).toBe('Status changed to Done')
    expect(eventText(message({ kind: 'event', event: { type: 'handoff' } }), i18n)).toBe(
      'Handed over to the team'
    )
    expect(
      messagePreview(
        message({ body: { format: 'blocks', content: '[]', fallbackText: 'Pick an option' } }),
        i18n
      )
    ).toBe('Pick an option')
  })
})

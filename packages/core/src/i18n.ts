import { en, type MessageKey, type PluralEntry } from './catalog.ts'
import type { Attachment, Conversation, Message } from './types.ts'

export type Params = Record<string, string | number>
export type DateInput = string | number | Date

export interface I18n {
  /** The BCP 47 locale used for `Intl` formatting, e.g. `en-GB`. */
  readonly locale: string
  readonly dir: 'ltr' | 'rtl'
  t(key: MessageKey, params?: Params): string
  /** `9:30 AM` */
  formatTime(date: DateInput): string
  /** `Mar 4` this year, `Mar 4, 2025` otherwise. */
  formatDate(date: DateInput, now?: number): string
  /** `Just now`, `6m`, `1h`, `1d`, then `formatDate`. */
  formatRelative(date: DateInput, now?: number): string
  /** `Today`, `Yesterday` or a date: for day dividers in a thread. */
  formatDay(date: DateInput, now?: number): string
  formatNumber(value: number): string
  /** `48 KB`, `1.2 MB` */
  formatFileSize(bytes: number): string
}

const RTL_LANGUAGES = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'he',
  'iw',
  'ks',
  'ps',
  'sd',
  'ug',
  'ur',
  'yi'
])

export function textDirection(locale: string): 'ltr' | 'rtl' {
  const language = locale.toLowerCase().split(/[-_]/)[0] ?? ''
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'
}

function safeLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? 'en'
  } catch {
    return 'en'
  }
}

function interpolate(template: string, params: Params | undefined): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value))

export interface I18nOptions {
  locale: string
  /** Per-key overrides: resolved `texts` from code and the dashboard. */
  texts?: Readonly<Record<string, string>>
}

export function createI18n({ locale: requested, texts = {} }: I18nOptions): I18n {
  const locale = safeLocale(requested)
  const plural = new Intl.PluralRules(locale)
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
  const shortDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const longDate = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const number = new Intl.NumberFormat(locale)
  const size = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })

  const t = (key: MessageKey, params?: Params): string => {
    const override = texts[key]
    if (typeof override === 'string') return interpolate(override, params)
    const entry = en[key] as string | PluralEntry | undefined
    if (entry === undefined) return key
    if (typeof entry === 'string') return interpolate(entry, params)
    const count = Number(params?.count ?? 0)
    const form = plural.select(count) as keyof PluralEntry
    return interpolate(entry[form] ?? entry.other, { ...params, count: number.format(count) })
  }

  const formatDate = (date: DateInput, now: number = Date.now()) => {
    const d = toDate(date)
    return d.getFullYear() === new Date(now).getFullYear()
      ? shortDate.format(d)
      : longDate.format(d)
  }

  return {
    locale,
    dir: textDirection(locale),
    t,
    formatTime: (date) => time.format(toDate(date)),
    formatDate,
    formatRelative(date, now = Date.now()) {
      const seconds = Math.round((toDate(date).getTime() - now) / 1000)
      const abs = Math.abs(seconds)
      if (abs < 45) return t('time.justNow')
      if (abs < 45 * 60) {
        const minutes = Math.max(1, Math.abs(Math.round(seconds / 60)))
        return t('time.minutes', { count: number.format(minutes) })
      }
      if (abs < 22 * 3600) {
        const hours = Math.max(1, Math.abs(Math.round(seconds / 3600)))
        return t('time.hours', { count: number.format(hours) })
      }
      if (abs < 6 * 86400) {
        const days = Math.max(1, Math.abs(Math.round(seconds / 86400)))
        return t('time.days', { count: number.format(days) })
      }
      return formatDate(date, now)
    },
    formatDay(date, now = Date.now()) {
      const startOfDay = (value: number) => new Date(value).setHours(0, 0, 0, 0)
      const days = Math.round((startOfDay(now) - startOfDay(toDate(date).getTime())) / 86400000)
      if (days === 0) return t('thread.today')
      if (days === 1) return t('thread.yesterday')
      return formatDate(date, now)
    },
    formatNumber: (value) => number.format(value),
    formatFileSize(bytes) {
      if (bytes < 1024) return `${number.format(bytes)} B`
      if (bytes < 1024 * 1024) return `${size.format(bytes / 1024)} KB`
      return `${size.format(bytes / (1024 * 1024))} MB`
    }
  }
}

function attachmentPreview(attachments: Attachment[], i18n: I18n): string {
  const gif = attachments.find((a) => a.kind === 'gif')
  if (gif && gif.kind === 'gif') {
    return gif.gif.title
      ? i18n.t('preview.gifTitled', { title: gif.gif.title })
      : i18n.t('preview.gif')
  }
  const [only] = attachments
  if (only && attachments.length === 1) {
    return only.kind === 'file' && only.isImage
      ? i18n.t('preview.image')
      : i18n.t('preview.attachment')
  }
  return i18n.t('preview.attachments', { count: attachments.length })
}

/** One line for conversation lists, toasts and the tab title (protocol 7.1 "Previews"). */
export function messagePreview(message: Message | null, i18n: I18n): string {
  if (!message) return ''
  if (message.kind === 'event') return eventText(message, i18n)
  const text = (
    message.body?.format === 'text' || message.body?.format === 'markdown'
      ? message.body.content
      : (message.body?.fallbackText ?? message.body?.content ?? '')
  ).trim()
  const line =
    text || (message.attachments.length > 0 ? attachmentPreview(message.attachments, i18n) : '')
  return message.sender.type === 'USER' && line ? i18n.t('list.youPrefix', { text: line }) : line
}

/** Title in the conversation list: ticket number, else last message, else a default. */
export function conversationTitle(
  conversation: Pick<Conversation, 'ticket' | 'lastMessage'>,
  i18n: I18n
): string {
  const number = conversation.ticket?.number
  if (typeof number === 'number' && number > 0) {
    return i18n.t('list.ticket', { number })
  }
  return messagePreview(conversation.lastMessage, i18n) || i18n.t('list.untitled')
}

/** The divider text for `kind: "event"` messages. */
export function eventText(message: Message, i18n: I18n): string {
  const event = message.event
  switch (event?.type) {
    case 'handoff':
    case 'contact_requested':
    case 'contact_saved':
    case 'ticket_created':
      return i18n.t(`event.${event.type}`)
    case 'status_changed':
      return i18n.t('event.status_changed', { status: event.status.label })
    default:
      return message.body?.fallbackText ?? i18n.t('event.unknown')
  }
}

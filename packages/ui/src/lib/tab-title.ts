import { setUnderlyingPageTitle } from '@ticketping/core'

const FLASH_MS = 1000

/** `99+` past the launcher badge cap, otherwise the locale's number. */
export function tabCountLabel(count: number, format: (value: number) => string): string | null {
  if (count <= 0) return null
  if (count > 99) return '99+'
  return format(count)
}

/** One line for the flashing title. A long message preview is clipped. */
export function tabAlert(preview: string, fallback: string): string {
  const line = preview.replace(/\s+/g, ' ').trim()
  if (!line) return fallback
  if (line.length <= 80) return line
  return `${line.slice(0, 79).trimEnd()}…`
}

export function decorateTitle(base: string, countLabel: string): string {
  return base ? `(${countLabel}) ${base}` : `(${countLabel})`
}

export function tabTitleFrame(input: {
  base: string
  countLabel: string | null
  alert: string
  hidden: boolean
  reduceMotion: boolean
  /** 0 is the prefixed page title. 1 is the alert, only while the tab is hidden. */
  phase: 0 | 1
}): string {
  if (!input.countLabel) return input.base
  const steady = decorateTitle(input.base, input.countLabel)
  if (!input.hidden || input.reduceMotion || input.phase === 0) return steady
  const alert = input.alert.trim()
  if (!alert || alert === input.base) return steady
  return decorateTitle(alert, input.countLabel)
}

export interface TabTitleInput {
  /** Unread, the panel is closed, and this is not the dashboard preview. */
  active: boolean
  countLabel: string | null
  alert: string
}

export interface TabTitle {
  update(input: TabTitleInput): void
  destroy(): void
}

/** Prefix `document.title` with the unread count, and flash the alert on a background tab. */
export function createTabTitle(doc: Document): TabTitle {
  let base = doc.title
  let lastWritten = doc.title
  let phase: 0 | 1 = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let current: TabTitleInput = { active: false, countLabel: null, alert: '' }

  const onVisibility = () => update(current)
  doc.addEventListener('visibilitychange', onVisibility)

  function readBase(): void {
    if (doc.title !== lastWritten) base = doc.title
  }

  function write(next: string): void {
    lastWritten = next
    if (doc.title !== next) doc.title = next
  }

  function stopFlash(): void {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    phase = 0
  }

  function paint(input: TabTitleInput, nextPhase: 0 | 1): string {
    const hidden = doc.visibilityState === 'hidden'
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    return tabTitleFrame({
      base,
      countLabel: input.countLabel,
      alert: input.alert,
      hidden,
      reduceMotion: reduce,
      phase: nextPhase
    })
  }

  function update(input: TabTitleInput): void {
    current = input
    readBase()
    stopFlash()
    if (!input.active || !input.countLabel) {
      setUnderlyingPageTitle(null)
      write(base)
      return
    }
    setUnderlyingPageTitle(base)
    write(paint(input, 0))
    if (paint(input, 0) === paint(input, 1)) return
    timer = setInterval(() => {
      readBase()
      setUnderlyingPageTitle(base)
      phase = phase === 0 ? 1 : 0
      write(paint(current, phase))
    }, FLASH_MS)
  }

  return {
    update,
    destroy() {
      stopFlash()
      doc.removeEventListener('visibilitychange', onVisibility)
      setUnderlyingPageTitle(null)
      write(base)
    }
  }
}

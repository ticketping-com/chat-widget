const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function visible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible)
}

/** Keep Tab inside the panel (the dialog already handles Escape). */
export function trapTab(root: HTMLElement, event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const list = focusables(root)
  if (list.length === 0) {
    event.preventDefault()
    root.focus()
    return
  }
  const first = list[0]
  const last = list[list.length - 1]
  if (!first || !last) return
  const active = root.ownerDocument.activeElement
  if (event.shiftKey && (active === first || active === root)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

export function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
}

export function gridMove(
  event: KeyboardEvent,
  index: number,
  count: number,
  columns: number
): number | null {
  const rtl =
    event.currentTarget instanceof HTMLElement && event.currentTarget.closest('[dir="rtl"]')
  const next: Record<string, number> = {
    ArrowRight: rtl ? -1 : 1,
    ArrowLeft: rtl ? 1 : -1,
    ArrowDown: columns,
    ArrowUp: -columns
  }
  if (event.key === 'Home') return 0
  if (event.key === 'End') return count - 1
  const delta = next[event.key]
  if (delta === undefined) return null
  return Math.max(0, Math.min(count - 1, index + delta))
}

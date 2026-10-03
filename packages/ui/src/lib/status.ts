import type { StatusTheme } from '@ticketping/core'

const THEME: Record<StatusTheme, string> = {
  RED: 'oklch(0.59 0.2 25)',
  GREEN: 'oklch(0.62 0.17 145)',
  BLUE: 'oklch(0.55 0.15 250)',
  YELLOW: 'oklch(0.75 0.15 85)',
  NEUTRAL: 'var(--tp-muted)'
}

export function statusColor(theme: StatusTheme): string {
  return THEME[theme] ?? THEME.NEUTRAL
}

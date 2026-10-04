const NEUTRAL = '#171717'
const WHITE = '#fff'

/** Dark or light text for an accent background. Non-hex colors get neutral dark text. */
const DARK_TEXT = NEUTRAL

function channels(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1]
  if (!hex) return null
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number]
}

function luminance(rgb: [number, number, number]): number {
  const linear = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(a: number, b: number): number {
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Dark or light text for an accent background, by WCAG relative luminance. Only `#rgb` and `#rrggbb`. */
export function onAccent(color: string): string {
  const rgb = channels(color)
  if (!rgb) return DARK_TEXT
  const lum = luminance(rgb)
  const contrastWhite = 1.05 / (lum + 0.05)
  const contrastDark = (lum + 0.05) / 0.06
  // White wins on saturated mid colors, where it is the readable large-text
  // choice even if near-black scores a bit higher.
  if (contrastWhite >= contrastDark || contrastWhite >= 3.5) return WHITE
  return DARK_TEXT
}

/**
 * The neutral starter is near-black on a light panel and white on a dark one.
 * A brand color with enough contrast is left alone.
 */
export function paintAccent(
  accent: string,
  mode: 'light' | 'dark'
): { accent: string; onAccent: string } {
  const rgb = channels(accent)
  const surface: [number, number, number] =
    mode === 'dark' ? [10 / 255, 10 / 255, 10 / 255] : [1, 1, 1]
  const visible =
    rgb && contrast(luminance(rgb), luminance(surface)) < 3
      ? mode === 'dark'
        ? WHITE
        : NEUTRAL
      : accent
  return { accent: visible, onAccent: onAccent(visible) }
}

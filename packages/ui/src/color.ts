const DARK_TEXT = 'oklch(21% 0.034 264.665)'
const LIGHT_TEXT = '#fff'

/** Dark or light text for an accent background, by WCAG relative luminance. Only `#rgb` and `#rrggbb`. */
export function onAccent(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1]
  if (!hex) return DARK_TEXT
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const contrastWhite = 1.05 / (luminance + 0.05)
  const contrastDark = (luminance + 0.05) / 0.06
  // White wins on saturated mid colors, where it is the readable large-text
  // choice even if near-black scores a bit higher.
  if (contrastWhite >= contrastDark || contrastWhite >= 3.5) return LIGHT_TEXT
  return DARK_TEXT
}

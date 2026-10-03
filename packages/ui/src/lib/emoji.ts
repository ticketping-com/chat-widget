/**
 * Emoji data from `emojibase-data` (Unicode CLDR labels) with Slack's (iamcal) shortcodes.
 * The JSON is about 90 KB gzipped, so it loads on first use.
 */

export interface Emoji {
  emoji: string
  hexcode: string
  label: string
  group: number
  order: number
  tags: string[]
  shortcodes: string[]
  skins?: string[] | undefined
}

export const SKIN_TONES = [
  { tone: 0, swatch: '✋' },
  { tone: 1, swatch: '✋🏻' },
  { tone: 2, swatch: '✋🏼' },
  { tone: 3, swatch: '✋🏽' },
  { tone: 4, swatch: '✋🏾' },
  { tone: 5, swatch: '✋🏿' }
] as const

export const EMOJI_GROUPS = [
  { id: 0, key: 'emoji.category.smileys' as const, icon: '😀' },
  { id: 1, key: 'emoji.category.people' as const, icon: '👋' },
  { id: 3, key: 'emoji.category.animals' as const, icon: '🐻' },
  { id: 4, key: 'emoji.category.food' as const, icon: '🍔' },
  { id: 5, key: 'emoji.category.travel' as const, icon: '✈️' },
  { id: 6, key: 'emoji.category.activities' as const, icon: '⚽' },
  { id: 7, key: 'emoji.category.objects' as const, icon: '💡' },
  { id: 8, key: 'emoji.category.symbols' as const, icon: '❤️' },
  { id: 9, key: 'emoji.category.flags' as const, icon: '🏁' }
] as const

interface CompactEmoji {
  group?: number
  hexcode: string
  label: string
  order?: number
  tags?: string[]
  unicode: string
  skins?: { hexcode: string; unicode: string }[]
}

const TONE_MODIFIERS = ['1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF']

function skinVariants(skins: CompactEmoji['skins']) {
  if (!skins?.length) return undefined
  const variants = TONE_MODIFIERS.map((modifier) => {
    const match = skins.find((skin) => {
      const parts = skin.hexcode.split('-').filter((part) => TONE_MODIFIERS.includes(part))
      return parts.length > 0 && parts.every((part) => part === modifier)
    })
    return match?.unicode ?? ''
  })
  return variants.every(Boolean) ? variants : undefined
}

let loading: Promise<Emoji[]> | null = null
let memoryRecents: string[] = []
let memoryTone = 0

export function loadEmoji(): Promise<Emoji[]> {
  loading ??= Promise.all([
    import('emojibase-data/en/compact.json'),
    import('emojibase-data/en/shortcodes/iamcal.json')
  ])
    .then(([compact, iamcal]) => {
      const data = (compact.default ?? compact) as unknown as CompactEmoji[]
      const codes = (iamcal.default ?? iamcal) as unknown as Record<string, string | string[]>
      return data
        .filter((item) => typeof item.group === 'number' && item.group !== 2)
        .map((item) => {
          const shortcodes = codes[item.hexcode]
          const skins = skinVariants(item.skins)
          return {
            emoji: item.unicode,
            hexcode: item.hexcode,
            label: item.label,
            group: item.group as number,
            order: item.order ?? 0,
            tags: item.tags ?? [],
            shortcodes: Array.isArray(shortcodes) ? shortcodes : shortcodes ? [shortcodes] : [],
            ...(skins ? { skins } : {})
          }
        })
        .sort((a, b) => a.order - b.order)
    })
    .catch((error: unknown) => {
      loading = null
      throw error
    })
  return loading ?? Promise.resolve([])
}

export function withTone(emoji: Emoji, tone: number) {
  return tone > 0 && emoji.skins ? (emoji.skins[tone - 1] ?? emoji.emoji) : emoji.emoji
}

/** Ranks shortcode prefix matches first, then label and tag matches. */
export function searchEmoji(list: Emoji[], query: string, limit = Infinity) {
  const q = query.trim().toLowerCase().replace(/^:/, '').replace(/:$/, '')
  if (!q) return list.slice(0, limit)
  const scored: { emoji: Emoji; score: number }[] = []
  for (const emoji of list) {
    let score = 0
    if (emoji.shortcodes.some((code) => code === q)) score = 100
    else if (emoji.shortcodes.some((code) => code.startsWith(q))) score = 80
    else if (emoji.label.toLowerCase().startsWith(q)) score = 70
    else if (
      emoji.label
        .toLowerCase()
        .split(/[\s:-]+/)
        .some((word) => word.startsWith(q))
    )
      score = 60
    else if (emoji.tags.some((tag) => tag.startsWith(q))) score = 50
    else if (emoji.shortcodes.some((code) => code.includes(q))) score = 30
    if (score) scored.push({ emoji, score })
  }
  scored.sort((a, b) => b.score - a.score || a.emoji.order - b.emoji.order)
  return scored.slice(0, limit).map((item) => item.emoji)
}

const RECENTS_KEY = 'tp:widget:emoji:recent'
const TONE_KEY = 'tp:widget:emoji:tone'
const MAX_RECENTS = 24

export function readRecents(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') as unknown
    if (Array.isArray(value)) {
      memoryRecents = value.filter((item) => typeof item === 'string')
    }
  } catch {
    // Private windows may block storage; keep the in-memory list.
  }
  return memoryRecents
}

export function pushRecent(hexcode: string) {
  memoryRecents = [hexcode, ...memoryRecents.filter((item) => item !== hexcode)].slice(
    0,
    MAX_RECENTS
  )
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(memoryRecents))
  } catch {
    // Recents still work for this session.
  }
  return memoryRecents
}

export function readTone() {
  try {
    const tone = Number(localStorage.getItem(TONE_KEY))
    if (tone >= 0 && tone <= 5) memoryTone = tone
  } catch {
    // Keep the in-memory tone.
  }
  return memoryTone
}

export function saveTone(tone: number) {
  memoryTone = tone
  try {
    localStorage.setItem(TONE_KEY, String(tone))
  } catch {
    // Falls back to the in-memory tone.
  }
}

/** `:thu` at the caret → query `thu`. Needs at least two characters after `:`. */
export function colonQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const match = /(?:^|\s):([a-z0-9_+-]{2,})$/i.exec(before)
  const captured = match?.[1]
  if (!captured) return null
  return { start: before.length - captured.length - 1, query: captured }
}

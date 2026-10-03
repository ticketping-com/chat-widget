import { describe, expect, it } from 'vitest'
import { shouldChime } from './sound.ts'

describe('shouldChime', () => {
  it('plays when unread grows while the panel is closed', () => {
    expect(shouldChime({ previous: 0, next: 1, open: false, preview: false })).toBe(true)
    expect(shouldChime({ previous: 2, next: 3, open: false, preview: false })).toBe(true)
  })

  it('stays quiet while open, in preview, or when the count does not rise', () => {
    expect(shouldChime({ previous: 0, next: 1, open: true, preview: false })).toBe(false)
    expect(shouldChime({ previous: 0, next: 1, open: false, preview: true })).toBe(false)
    expect(shouldChime({ previous: 2, next: 2, open: false, preview: false })).toBe(false)
    expect(shouldChime({ previous: 2, next: 0, open: false, preview: false })).toBe(false)
  })
})

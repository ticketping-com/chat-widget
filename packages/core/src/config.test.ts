import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, resolveConfig } from './config.ts'
import type { ConfigOverrides, OverridableConfig } from './types.ts'

const dashboard: OverridableConfig = {
  appearance: {
    accentColor: '#112233',
    colorMode: 'dark',
    position: 'bottom-left',
    launcher: { icon: 'help', label: 'Support' }
  },
  texts: { greetingTitle: 'Hey from Acme' },
  features: { ai: true, attachments: true, emailCapture: true, emoji: true, gifs: false }
}

describe('resolveConfig', () => {
  it('uses dashboard values when code sets nothing', () => {
    const config = resolveConfig(dashboard)
    expect(config.appearance).toEqual(dashboard.appearance)
    expect(config.texts.greetingTitle).toBe('Hey from Acme')
    expect(config.texts.composerPlaceholder).toBe('Type a message...')
  })

  it('lets code override appearance and texts, key by key', () => {
    const config = resolveConfig(dashboard, {
      appearance: { accentColor: '#ff0000', launcher: { label: 'Chat' } },
      texts: { greetingBody: 'Code wins' }
    })
    expect(config.appearance).toEqual({
      accentColor: '#ff0000',
      colorMode: 'dark',
      position: 'bottom-left',
      launcher: { icon: 'help', label: 'Chat' }
    })
    expect(config.texts.greetingTitle).toBe('Hey from Acme')
    expect(config.texts.greetingBody).toBe('Code wins')
  })

  it('ignores undefined override values instead of erasing the dashboard value', () => {
    const config = resolveConfig(dashboard, {
      appearance: { accentColor: undefined }
    } as unknown as ConfigOverrides)
    expect(config.appearance.accentColor).toBe('#112233')
  })

  it('lets code switch features off but never on', () => {
    const overrides = {
      features: { ai: false, emoji: false, gifs: true }
    } as unknown as ConfigOverrides
    const config = resolveConfig(dashboard, overrides)
    expect(config.features).toEqual({
      ai: false,
      attachments: true,
      emailCapture: true,
      emoji: false,
      gifs: false
    })
    expect(config.ignoredFeatureOverrides).toEqual(['gifs'])
  })

  it('falls back to built-in defaults before boot returns', () => {
    expect(resolveConfig(undefined).appearance).toEqual(DEFAULT_CONFIG.appearance)
  })
})

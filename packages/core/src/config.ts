import { en } from './catalog.ts'
import type { ConfigOverrides, FeatureName, OverridableConfig } from './types.ts'

export const DEFAULT_TEXTS: Readonly<Record<string, string>> = {
  greetingTitle: en.greetingTitle,
  greetingBody: en.greetingBody,
  composerPlaceholder: en.composerPlaceholder,
  conversationStarter: en.conversationStarter
}

export const DEFAULT_CONFIG: OverridableConfig = {
  appearance: {
    accentColor: '#171717',
    colorMode: 'auto',
    position: 'bottom-right',
    launcher: { icon: 'chat', label: null, hideWhenOpen: false }
  },
  texts: {},
  features: { ai: false, attachments: true, emailCapture: true, emoji: true, gifs: false }
}

export interface ResolvedConfig extends OverridableConfig {
  /** Features the host tried to switch on although the dashboard has them off. */
  ignoredFeatureOverrides: FeatureName[]
}

/** Drops keys whose value is `undefined`, so `{ accentColor: undefined }` can't erase a dashboard value. */
const defined = <T extends object>(obj: T | undefined): T =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => v !== undefined)) as T

/** Code overrides, then the dashboard, then built-in defaults (spec/protocol.md 3.1.1). */
export function resolveConfig(
  dashboard: OverridableConfig | undefined,
  overrides: ConfigOverrides = {}
): ResolvedConfig {
  const base = dashboard ?? DEFAULT_CONFIG
  const { launcher, ...appearance } = overrides.appearance ?? {}

  const features = { ...base.features }
  const ignoredFeatureOverrides: FeatureName[] = []
  for (const [key, value] of Object.entries(overrides.features ?? {}) as [FeatureName, unknown][]) {
    if (value === false) features[key] = false
    else if (value === true && !base.features[key]) ignoredFeatureOverrides.push(key)
  }

  return {
    appearance: {
      ...base.appearance,
      ...defined(appearance),
      launcher: { ...base.appearance.launcher, ...defined(launcher) }
    },
    texts: { ...DEFAULT_TEXTS, ...defined(base.texts), ...defined(overrides.texts) },
    features,
    ignoredFeatureOverrides
  }
}

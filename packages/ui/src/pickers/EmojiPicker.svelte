<script lang="ts">
  import type { I18n } from '@ticketping/core'
  import {
    EMOJI_GROUPS,
    loadEmoji,
    pushRecent,
    readRecents,
    readTone,
    saveTone,
    searchEmoji,
    SKIN_TONES,
    withTone,
    type Emoji
  } from '../lib/emoji.ts'
  import { gridMove } from '../lib/focus.ts'

  interface Props {
    i18n: I18n
    onPick: (emoji: string) => void
    onClose: () => void
  }

  const { i18n, onPick, onClose }: Props = $props()
  const COLUMNS = 8

  let all = $state.raw<Emoji[]>([])
  let loadError = $state(false)
  let query = $state('')
  let tone = $state(readTone())
  let toneOpen = $state(false)
  let recents = $state<string[]>(readRecents())
  let focusIndex = $state(0)
  let grid: HTMLDivElement | undefined = $state()
  let searchInput: HTMLInputElement | undefined = $state()

  const byHex = $derived(new Map(all.map((emoji) => [emoji.hexcode, emoji])))
  const recentEmoji = $derived(
    recents.map((hex) => byHex.get(hex)).filter((item): item is Emoji => !!item)
  )
  const results = $derived(query.trim() ? searchEmoji(all, query, 160) : [])
  const sections = $derived.by(() => {
    if (query.trim()) return [{ id: 'results', label: i18n.t('emoji.search'), items: results }]
    const groups = EMOJI_GROUPS.map((group) => ({
      id: `group-${group.id}`,
      label: i18n.t(group.key),
      items: all.filter((emoji) => emoji.group === group.id)
    }))
    return recentEmoji.length
      ? [{ id: 'recent', label: i18n.t('emoji.recent'), items: recentEmoji }, ...groups]
      : groups
  })
  const flat = $derived(sections.flatMap((section) => section.items))

  $effect(() => {
    let cancelled = false
    loadError = false
    void loadEmoji()
      .then((list) => {
        if (!cancelled) all = list
      })
      .catch(() => {
        if (!cancelled) loadError = true
      })
    searchInput?.focus()
    return () => {
      cancelled = true
    }
  })

  function pick(emoji: Emoji) {
    onPick(withTone(emoji, tone))
    recents = pushRecent(emoji.hexcode)
    onClose()
  }

  function setTone(next: number) {
    tone = next
    saveTone(next)
    toneOpen = false
  }

  function buttons() {
    return grid ? [...grid.querySelectorAll<HTMLButtonElement>('[data-emoji-index]')] : []
  }

  function focusAt(index: number) {
    const list = buttons()
    if (!list.length) return
    focusIndex = Math.max(0, Math.min(index, list.length - 1))
    const button = list[focusIndex]
    button?.focus()
    button?.scrollIntoView({ block: 'nearest' })
  }

  function onGridKeydown(event: KeyboardEvent) {
    const next = gridMove(event, focusIndex, flat.length, COLUMNS)
    if (next === null) return
    event.preventDefault()
    if (event.key === 'ArrowUp' && next === focusIndex) searchInput?.focus()
    else focusAt(next)
  }

  function onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusAt(0)
    } else if (event.key === 'Enter' && flat[0]) {
      event.preventDefault()
      pick(flat[0])
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }
</script>

<div class="picker" role="dialog" aria-label={i18n.t('composer.emoji')}>
  <div class="toolbar">
    <input
      bind:this={searchInput}
      bind:value={query}
      type="search"
      class="search"
      placeholder={i18n.t('emoji.search')}
      aria-label={i18n.t('emoji.search')}
      autocomplete="off"
      spellcheck="false"
      onkeydown={onSearchKeydown}
      oninput={() => (focusIndex = 0)}
    />
    <div class="tones">
      <button
        type="button"
        class="tone"
        aria-label={i18n.t('emoji.skinTone')}
        aria-expanded={toneOpen}
        onclick={() => (toneOpen = !toneOpen)}
      >
        {SKIN_TONES[tone]?.swatch}
      </button>
      {#if toneOpen}
        <div class="tone-menu" role="radiogroup" aria-label={i18n.t('emoji.skinTone')}>
          {#each SKIN_TONES as option (option.tone)}
            <button
              type="button"
              role="radio"
              aria-checked={tone === option.tone}
              aria-label={i18n.t('emoji.skinTone')}
              class="tone"
              onclick={() => setTone(option.tone)}
            >
              {option.swatch}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if !query.trim()}
    <div class="cats" role="toolbar" aria-label={i18n.t('composer.emoji')}>
      {#each EMOJI_GROUPS as group (group.id)}
        <button
          type="button"
          class="cat"
          aria-label={i18n.t(group.key)}
          title={i18n.t(group.key)}
          onclick={() => {
            query = ''
            queueMicrotask(() => {
              grid?.querySelector(`[data-section="group-${group.id}"]`)?.scrollIntoView({
                block: 'start'
              })
            })
          }}
        >
          {group.icon}
        </button>
      {/each}
    </div>
  {/if}

  <div bind:this={grid} class="grid" role="grid" tabindex="-1" onkeydown={onGridKeydown}>
    {#if loadError}
      <p class="empty">{i18n.t('error.generic')}</p>
    {:else if !all.length}
      <p class="empty">{i18n.t('list.loading')}</p>
    {:else if query.trim() && !results.length}
      <p class="empty">{i18n.t('emoji.noResults')}</p>
    {:else}
      {#each sections as section (section.id)}
        {#if section.items.length}
          <h3 class="label" data-section={section.id}>{section.label}</h3>
          <div class="cells" style:--cols={COLUMNS}>
            {#each section.items as emoji (`${section.id}-${emoji.hexcode}`)}
              {@const index = flat.indexOf(emoji)}
              <button
                type="button"
                data-emoji-index={index}
                title={emoji.label}
                aria-label={emoji.label}
                onclick={() => pick(emoji)}
              >
                {withTone(emoji, tone)}
              </button>
            {/each}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    height: 280px;
    border-top: 1px solid var(--tp-border);
    background: var(--tp-surface);
    transform-origin: bottom center;
    animation: tp-picker 200ms var(--tp-ease-out);
  }

  @keyframes tp-picker {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .picker {
      animation: none;
    }
  }

  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 8px;
  }

  .search {
    flex: 1;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--tp-border);
    border-radius: 8px;
    background: var(--tp-fill);
    color: var(--tp-text);
    font: inherit;
    font-size: 13px;
  }

  .tones {
    position: relative;
  }

  .tone,
  .cat,
  .cells button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font-size: 18px;
    cursor: pointer;
  }

  .tone-menu {
    position: absolute;
    z-index: 2;
    top: 36px;
    inset-inline-end: 0;
    display: flex;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--tp-border);
    border-radius: 8px;
    background: var(--tp-surface);
    box-shadow: var(--tp-shadow);
  }

  .cats {
    display: flex;
    justify-content: space-between;
    padding: 0 8px 6px;
  }

  .grid {
    flex: 1;
    overflow: auto;
    padding: 0 8px 8px;
  }

  .label {
    margin: 8px 4px 4px;
    color: var(--tp-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .cells {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
  }

  .empty {
    margin: 24px 8px;
    color: var(--tp-muted);
    text-align: center;
  }

  .search:focus-visible,
  .tone:focus-visible,
  .cat:focus-visible,
  .cells button:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }
</style>

<script lang="ts">
  import {
    isTicketpingError,
    type GifResult,
    type I18n,
    type WidgetController
  } from '@ticketping/core'
  import { gridMove } from '../lib/focus.ts'

  interface Props {
    controller: WidgetController
    i18n: I18n
    preview: boolean
    onPick: (gif: GifResult) => void
    onClose: () => void
  }

  const { controller, i18n, preview, onPick, onClose }: Props = $props()
  const COLUMNS = 2

  let query = $state('')
  let results = $state.raw<GifResult[]>([])
  let nextOffset = $state<number | null>(0)
  let loading = $state(false)
  let error = $state('')
  let focusIndex = $state(0)
  let searchInput: HTMLInputElement | undefined = $state()
  let grid: HTMLDivElement | undefined = $state()
  let request = 0
  let debounce: ReturnType<typeof setTimeout> | undefined

  async function fetchPage(reset: boolean) {
    if (preview) {
      results = []
      nextOffset = null
      loading = false
      return
    }
    const offset = reset ? 0 : nextOffset
    if (offset === null) return
    const id = ++request
    const q = query.trim()
    loading = true
    error = ''
    try {
      const page = q
        ? await controller.searchGifs(q.slice(0, 50), offset)
        : await controller.trendingGifs(offset)
      if (id !== request) return
      results = reset ? page.results : [...results, ...page.results]
      nextOffset = page.nextOffset
    } catch (err) {
      if (id !== request) return
      error = isTicketpingError(err, 'gifs_unavailable')
        ? i18n.t('gif.error')
        : isTicketpingError(err, 'rate_limited')
          ? i18n.t('error.rateLimited')
          : i18n.t('gif.error')
      if (reset) results = []
    }
    if (id === request) loading = false
  }

  $effect(() => {
    searchInput?.focus()
    void fetchPage(true)
    return () => {
      clearTimeout(debounce)
      request += 1
    }
  })

  function onInput() {
    clearTimeout(debounce)
    debounce = setTimeout(() => void fetchPage(true), 300)
  }

  function onGridKeydown(event: KeyboardEvent) {
    const next = gridMove(event, focusIndex, results.length, COLUMNS)
    if (next === null) return
    event.preventDefault()
    focusIndex = next
    grid?.querySelectorAll<HTMLButtonElement>('[data-gif-index]')[next]?.focus()
  }
</script>

<div class="picker" role="dialog" aria-label={i18n.t('composer.gif')}>
  <div class="toolbar">
    <input
      bind:this={searchInput}
      bind:value={query}
      type="search"
      class="search"
      placeholder={i18n.t('gif.search')}
      aria-label={i18n.t('gif.search')}
      autocomplete="off"
      oninput={onInput}
      onkeydown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    />
  </div>
  <p class="credit">{i18n.t('gif.poweredBy')}</p>
  <div bind:this={grid} class="grid" role="listbox" tabindex="-1" onkeydown={onGridKeydown}>
    {#if error}
      <p class="empty">{error}</p>
    {:else if !results.length && !loading}
      <p class="empty">{query.trim() ? i18n.t('gif.noResults') : i18n.t('gif.trending')}</p>
    {:else}
      {#each results as gif, index (gif.id)}
        <button
          type="button"
          class="cell"
          role="option"
          aria-selected={focusIndex === index}
          data-gif-index={index}
          style:aspect-ratio="{gif.width} / {gif.height}"
          aria-label={gif.title || i18n.t('gif.fallbackTitle')}
          onclick={() => onPick(gif)}
        >
          <img src={gif.previewUrl || gif.stillUrl} alt="" loading="lazy" />
        </button>
      {/each}
    {/if}
  </div>
  {#if nextOffset !== null && results.length}
    <button type="button" class="more" disabled={loading} onclick={() => void fetchPage(false)}>
      {i18n.t('gif.loadMore')}
    </button>
  {/if}
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
    padding: 8px 8px 0;
  }

  .search {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--tp-border);
    border-radius: 8px;
    background: var(--tp-fill);
    color: var(--tp-text);
    font: inherit;
    font-size: 13px;
  }

  .credit {
    margin: 4px 10px 6px;
    color: var(--tp-muted);
    font-size: 11px;
    font-weight: 600;
  }

  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    align-content: start;
    overflow: auto;
    padding: 0 8px 8px;
  }

  .cell {
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: 8px;
    background: var(--tp-fill);
    cursor: pointer;
  }

  .cell img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty {
    grid-column: 1 / -1;
    margin: 24px 8px;
    color: var(--tp-muted);
    text-align: center;
  }

  .more {
    margin: 0 8px 8px;
    height: 32px;
    border: 0;
    border-radius: 8px;
    background: var(--tp-fill);
    color: var(--tp-text);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .search:focus-visible,
  .cell:focus-visible,
  .more:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }
</style>

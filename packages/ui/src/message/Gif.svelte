<script lang="ts">
  import type { GifMedia, I18n } from '@ticketping/core'
  import { prefersReducedMotion } from '../lib/focus.ts'

  interface Props {
    gif: GifMedia
    i18n: I18n
  }

  const { gif, i18n }: Props = $props()
  const title = $derived(gif.title.trim() || i18n.t('gif.fallbackTitle'))
  const reduced = $derived(prefersReducedMotion())
  let playing = $state(false)
  const showStill = $derived(reduced && !playing)
  const width = $derived(gif.width > 0 ? Math.min(gif.width, 240) : 240)
  const ratio = $derived(gif.width > 0 && gif.height > 0 ? `${gif.width} / ${gif.height}` : '4 / 3')
</script>

<figure class="gif" style:width="{width}px" style:aspect-ratio={ratio}>
  {#if showStill}
    <button
      type="button"
      class="play"
      aria-label={i18n.t('gif.play', { title })}
      onclick={() => (playing = true)}
    >
      <img src={gif.stillUrl} alt="" />
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 6v12l10-6z" fill="currentColor" /></svg>
      </span>
    </button>
  {:else}
    {#if reduced}
      <button
        type="button"
        class="pause"
        aria-label={i18n.t('gif.pause', { title })}
        onclick={() => (playing = false)}
      >
        {i18n.t('gif.pause', { title })}
      </button>
    {/if}
    <video
      src={gif.mp4Url || gif.webpUrl || gif.gifUrl}
      poster={gif.stillUrl}
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      aria-label={title}
    ></video>
  {/if}
  <figcaption class="tp-sr">{title}</figcaption>
</figure>

<style>
  .gif {
    position: relative;
    max-width: 100%;
    margin: 8px 0 0;
    overflow: hidden;
    border-radius: 12px;
    background: var(--tp-fill);
  }

  img,
  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .icon {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: auto;
    width: 40px;
    height: 40px;
    border-radius: 20px;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
  }

  .icon svg {
    width: 18px;
    height: 18px;
  }

  .pause {
    position: absolute;
    z-index: 1;
    inset-block-start: 8px;
    inset-inline-end: 8px;
    padding: 4px 8px;
    border: 0;
    border-radius: 8px;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .play:focus-visible,
  .pause:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }
</style>

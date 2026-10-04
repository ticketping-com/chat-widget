<script lang="ts">
  import type { Appearance, I18n } from '@ticketping/core'

  interface Props {
    open: boolean
    unreadCount: number
    appearance: Appearance['launcher']
    i18n: I18n
    onclick: () => void
    button?: HTMLButtonElement | undefined
  }

  let { open, unreadCount, appearance, i18n, onclick, button = $bindable() }: Props = $props()

  const icon = $derived(
    appearance.icon === 'help' || appearance.icon === 'none' ? appearance.icon : 'chat'
  )
  const caption = $derived((appearance.label ?? '').trim())
  const labeled = $derived(caption.length > 0)

  const label = $derived(
    open
      ? i18n.t('launcher.close')
      : unreadCount > 0
        ? i18n.t('launcher.openUnread', { count: unreadCount })
        : i18n.t('launcher.open')
  )
</script>

<button
  bind:this={button}
  type="button"
  class="launcher"
  aria-label={label}
  aria-expanded={open}
  data-open={open}
  data-icon={icon}
  data-labeled={labeled}
  {onclick}
>
  <span class="mark" aria-hidden="true">
    {#if icon === 'help'}
      <svg class="icon icon-face" viewBox="0 0 18 18">
        <path
          d="M6.5 6.4c0-1.55 1.35-2.8 2.75-2.8s2.75 1.25 2.75 2.8c0 1.4-.95 2.1-2 2.7-.8.45-1.25.9-1.25 1.8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="9" cy="13.85" r="1.05" fill="currentColor" />
      </svg>
    {:else if icon === 'chat'}
      <svg class="icon icon-face" viewBox="0 0 18 18">
        <path
          d="M14.25,2.25H3.75c-1.105,0-2,.896-2,2v7c0,1.104,.895,2,2,2h2v3l3.75-3h4.75c1.105,0,2-.896,2-2V4.25c0-1.104-.895-2-2-2Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
    <svg class="icon icon-close" viewBox="0 0 18 18">
      <line
        x1="14"
        y1="4"
        x2="4"
        y2="14"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1"
      />
      <line
        x1="4"
        y1="4"
        x2="14"
        y2="14"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1"
      />
    </svg>
  </span>
  {#if labeled && !open}
    <span class="caption">{caption}</span>
  {/if}
  {#if unreadCount > 0 && !open}
    <span class="badge" aria-hidden="true"
      >{unreadCount > 99 ? '99+' : i18n.formatNumber(unreadCount)}</span
    >
  {/if}
</button>

<style>
  .launcher {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    padding: 0;
    border: 0;
    border-radius: var(--tp-radius-launcher);
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    font: inherit;
    box-shadow: var(--tp-shadow);
    cursor: pointer;
    transition:
      transform 160ms var(--tp-ease-out),
      width 200ms var(--tp-ease-out),
      padding 200ms var(--tp-ease-out),
      gap 200ms var(--tp-ease-out);
    -webkit-tap-highlight-color: transparent;
  }

  .launcher[data-labeled='true']:not([data-open='true']) {
    width: auto;
    max-width: min(280px, calc(100vw - 48px));
    padding-inline: 16px 20px;
    gap: 8px;
  }

  .launcher:active {
    transform: scale(0.96);
  }

  .launcher:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 3px;
  }

  .mark {
    position: relative;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    flex: none;
  }

  .launcher[data-icon='none'][data-labeled='true']:not([data-open='true']) .mark {
    display: none;
  }

  .icon {
    grid-area: 1 / 1;
    width: 28px;
    height: 28px;
    transition:
      opacity 300ms var(--tp-ease-icon),
      transform 300ms var(--tp-ease-icon),
      filter 300ms var(--tp-ease-icon);
  }

  .icon-close {
    width: 22px;
    height: 22px;
  }

  .icon-close,
  [data-open='true'] .icon-face {
    opacity: 0;
    transform: scale(0.25);
    filter: blur(4px);
  }

  .icon-face,
  [data-open='true'] .icon-close {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }

  .caption {
    overflow: hidden;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .badge {
    position: absolute;
    top: -4px;
    inset-inline-end: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: oklch(0.58 0.22 17);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
    border: 2px solid #fff;
    animation: tp-badge 1.5s ease-in-out infinite;
  }

  @keyframes tp-badge {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .launcher,
    .icon,
    .badge {
      transition: none;
      animation: none;
    }
  }
</style>

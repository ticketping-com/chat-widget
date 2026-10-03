<script lang="ts">
  import type { I18n } from '@ticketping/core'

  interface Props {
    open: boolean
    unreadCount: number
    i18n: I18n
    onclick: () => void
    button?: HTMLButtonElement | undefined
  }

  let { open, unreadCount, i18n, onclick, button = $bindable() }: Props = $props()

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
  {onclick}
>
  <svg class="icon icon-chat" viewBox="0 0 18 18" aria-hidden="true">
    <path
      d="M14.25,2.25H3.75c-1.105,0-2,.896-2,2v7c0,1.104,.895,2,2,2h2v3l3.75-3h4.75c1.105,0,2-.896,2-2V4.25c0-1.104-.895-2-2-2Z"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg class="icon icon-close" viewBox="0 0 18 18" aria-hidden="true">
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
  {#if unreadCount > 0 && !open}
    <span class="badge" aria-hidden="true"
      >{unreadCount > 99 ? '99+' : i18n.formatNumber(unreadCount)}</span
    >
  {/if}
</button>

<style>
  .launcher {
    position: relative;
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    padding: 0;
    border: 0;
    border-radius: var(--tp-radius-launcher);
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    box-shadow: var(--tp-shadow);
    cursor: pointer;
    transition: transform 160ms var(--tp-ease-out);
    -webkit-tap-highlight-color: transparent;
  }

  .launcher:active {
    transform: scale(0.96);
  }

  .launcher:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 3px;
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
  [data-open='true'] .icon-chat {
    opacity: 0;
    transform: scale(0.25);
    filter: blur(4px);
  }

  .icon-chat,
  [data-open='true'] .icon-close {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
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

<script lang="ts">
  interface Props {
    open: boolean
    unreadCount: number
    onclick: () => void
  }

  const { open, unreadCount, onclick }: Props = $props()

  const label = $derived(
    open
      ? 'Close chat'
      : unreadCount > 0
        ? `Open chat, ${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`
        : 'Open chat'
  )
</script>

<button
  type="button"
  class="launcher"
  aria-label={label}
  aria-expanded={open}
  data-open={open}
  {onclick}
>
  <svg class="icon icon-chat" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6A.5.5 0 0 1 5 19.2V16h-.5A2.5 2.5 0 0 1 2 13.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
  <svg class="icon icon-close" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 6l12 12M18 6L6 18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
  {#if unreadCount > 0 && !open}
    <span class="badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>
  {/if}
</button>

<style>
  .launcher {
    position: relative;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    padding: 0;
    border: 0;
    border-radius: var(--tp-radius-launcher);
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    box-shadow: var(--tp-shadow);
    cursor: pointer;
    transition: transform 160ms cubic-bezier(0.2, 0, 0, 1);
    -webkit-tap-highlight-color: transparent;
  }

  .launcher:active {
    transform: scale(0.94);
  }

  .launcher:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 3px;
  }

  .icon {
    grid-area: 1 / 1;
    width: 26px;
    height: 26px;
    transition:
      opacity 160ms ease,
      transform 200ms cubic-bezier(0.2, 0, 0, 1);
  }

  .icon-close,
  [data-open='true'] .icon-chat {
    opacity: 0;
    transform: rotate(-45deg) scale(0.6);
  }

  [data-open='true'] .icon-close {
    opacity: 1;
    transform: none;
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
  }

  @media (prefers-reduced-motion: reduce) {
    .launcher,
    .icon {
      transition: none;
    }
  }
</style>

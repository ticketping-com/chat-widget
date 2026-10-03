<script lang="ts">
  import type { ConnectionState, I18n } from '@ticketping/core'

  interface Props {
    connection: ConnectionState
    i18n: I18n
  }

  const { connection, i18n }: Props = $props()
  const visible = $derived(connection === 'reconnecting' || connection === 'offline')
  const text = $derived(
    connection === 'offline'
      ? i18n.t('connection.offline')
      : connection === 'reconnecting'
        ? i18n.t('connection.reconnecting')
        : ''
  )
</script>

{#if visible}
  <div class="banner" data-state={connection} role="status">
    {text}
  </div>
{/if}

<style>
  .banner {
    padding: 8px 16px;
    animation: tp-banner 200ms var(--tp-ease-out);
    background: color-mix(in oklab, var(--tp-danger) 12%, var(--tp-surface));
    color: var(--tp-danger);
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }

  @keyframes tp-banner {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .banner {
      animation: none;
    }
  }

  .banner[data-state='reconnecting'] {
    background: color-mix(in oklab, var(--tp-focus) 12%, var(--tp-surface));
    color: var(--tp-focus);
  }
</style>

<script lang="ts">
  import { eventText, type I18n, type ThreadMessage } from '@ticketping/core'

  interface Props {
    message: ThreadMessage
    i18n: I18n
  }

  const { message, i18n }: Props = $props()
</script>

<div class="event" role="status">
  <span>{eventText(message, i18n)}</span>
</div>

<style>
  .event {
    display: flex;
    justify-content: center;
    padding: 8px 12px;
  }

  span {
    max-width: 100%;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--tp-fill);
    color: var(--tp-muted);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  }
</style>

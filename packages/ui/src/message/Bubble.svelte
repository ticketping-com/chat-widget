<script lang="ts">
  import type { I18n, ThreadMessage, WidgetController } from '@ticketping/core'
  import Attachments from './Attachments.svelte'
  import Body from './Body.svelte'

  interface Props {
    message: ThreadMessage
    i18n: I18n
    controller: WidgetController
    showTime?: boolean
    arrive?: boolean
    joinPrev?: boolean
    joinNext?: boolean
  }

  const {
    message,
    i18n,
    controller,
    showTime = false,
    arrive = false,
    joinPrev = false,
    joinNext = false
  }: Props = $props()
  const mine = $derived(message.sender.type === 'USER')
  const sending = $derived(message.delivery === 'sending')
  const failed = $derived(message.delivery === 'failed')
  const showByline = $derived(showTime || sending)
  let holdSending = $state(false)
  $effect.pre(() => {
    if (sending) holdSending = true
  })
  const swapSending = $derived(mine && holdSending)
  const who = $derived.by(() => {
    if (mine) return ''
    if (message.sender.type === 'AI') {
      return message.sender.name
        ? `${message.sender.name} · ${i18n.t('sender.ai')}`
        : i18n.t('sender.ai')
    }
    return message.sender.name ?? i18n.t('sender.agentFallback')
  })
</script>

<article
  class="row"
  class:arrive
  class:mine
  class:joins-prev={joinPrev}
  class:joins-next={joinNext}
  data-sender={message.sender.type}
  data-delivery={message.delivery ?? 'stored'}
>
  <div class="bubble">
    <Body body={message.body} />
    {#if message.attachments.length}
      <Attachments attachments={message.attachments} {i18n} />
    {/if}
  </div>
  {#if showByline}
    <p class="byline">
      {#if who}
        <span>{who}</span>
        <span class="sep" aria-hidden="true">·</span>
      {/if}
      {#if swapSending}
        <span class="swap" class:is-sending={sending}>
          <span class="swap-sending" aria-hidden={!sending}>{i18n.t('delivery.sending')}</span>
          <time class="swap-time" datetime={message.createdAt} aria-hidden={sending}>
            {i18n.formatRelative(message.createdAt)}
          </time>
        </span>
      {:else}
        <time datetime={message.createdAt}>{i18n.formatRelative(message.createdAt)}</time>
      {/if}
    </p>
  {/if}
  {#if failed}
    <p class="status fail" role="alert">
      {message.error?.code === 'rate_limited'
        ? i18n.t('delivery.rateLimited')
        : i18n.t('delivery.failed')}
      <button type="button" onclick={() => controller.retry(message.clientId ?? '')}>
        {i18n.t('delivery.retry')}
      </button>
      <button type="button" onclick={() => controller.discard(message.clientId ?? '')}>
        {i18n.t('delivery.discard')}
      </button>
    </p>
  {/if}
</article>

<style>
  .row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 86%;
  }

  .row.mine {
    align-self: flex-end;
    align-items: flex-end;
  }

  .row.arrive {
    animation: tp-message 200ms var(--tp-ease-out) both;
  }

  .byline {
    display: flex;
    gap: 0.4em;
    align-items: baseline;
    margin: 6px 4px 0;
    color: var(--tp-muted);
    font-size: 12px;
    line-height: 1.3;
  }

  .swap {
    display: inline-grid;
    justify-items: end;
  }

  .swap > * {
    grid-area: 1 / 1;
    transition: opacity 180ms var(--tp-ease-out);
  }

  .swap-sending {
    opacity: 0;
  }

  .swap.is-sending .swap-sending {
    opacity: 1;
  }

  .swap.is-sending .swap-time {
    opacity: 0;
  }

  .row.joins-prev {
    margin-top: -4px;
  }

  .bubble {
    padding: 10px 14px;
    border-radius: 18px;
    background: var(--tp-bubble);
  }

  .row.joins-prev .bubble {
    border-start-start-radius: 6px;
  }

  .row.joins-next .bubble {
    border-end-start-radius: 6px;
  }

  .row.mine.joins-prev .bubble {
    border-start-start-radius: 18px;
    border-start-end-radius: 6px;
  }

  .row.mine.joins-next .bubble {
    border-end-start-radius: 18px;
    border-end-end-radius: 6px;
  }

  .status {
    margin: 4px 4px 0;
    color: var(--tp-muted);
    font-size: 12px;
  }

  .status.fail {
    color: var(--tp-danger);
  }

  .status button {
    margin-inline-start: 6px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }

  @keyframes tp-message {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .row.arrive {
      animation: none;
    }

    .swap > * {
      transition: none;
    }
  }

  .status button:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }
</style>

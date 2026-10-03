<script lang="ts">
  import { NEW_CONVERSATION, type WidgetController, type WidgetState } from '@ticketping/core'
  import { statusColor } from '../lib/status.ts'
  import Event from '../message/Event.svelte'
  import Bubble from '../message/Bubble.svelte'
  import Composer from './Composer.svelte'
  import EmailForm from './EmailForm.svelte'
  import PoweredBy from './PoweredBy.svelte'

  interface Props {
    controller: WidgetController
    widget: WidgetState
    conversationId: string | null
  }

  const { controller, widget, conversationId }: Props = $props()
  const i18n = $derived(widget.i18n)
  const key = $derived(conversationId ?? NEW_CONVERSATION)
  const conversation = $derived(
    conversationId
      ? (widget.conversations.find((item) => item.id === conversationId) ?? null)
      : null
  )
  const thread = $derived(widget.threads[key])
  const messages = $derived(thread?.messages ?? [])
  const typing = $derived(conversationId ? widget.typing[conversationId] : undefined)
  const showEmail = $derived.by(() => {
    if (!widget.config.features.emailCapture || !conversation) return false
    if (widget.identity.contactEmail || widget.identity.email) return false
    return (
      conversation.phase === 'needs_contact' ||
      messages.some((message) => message.event?.type === 'contact_requested')
    )
  })
  const showStarter = $derived(conversationId === null && !thread?.error)
  const availability = $derived(widget.config.team.availability)
  const awayTitle = $derived.by(() => {
    if (availability.next) return i18n.t('availability.offlineBack', availability.next)
    if (availability.hours)
      return i18n.t('availability.offlineHours', { hours: availability.hours })
    return i18n.t('availability.offline')
  })
  const typingText = $derived.by(() => {
    if (!typing) return ''
    if (typing.sender.type === 'AI') return i18n.t('thread.aiThinking')
    if (typing.sender.name) return i18n.t('thread.typing', { name: typing.sender.name })
    return i18n.t('thread.typingSomeone')
  })

  let scroller: HTMLElement | undefined = $state()
  let pinned = $state(true)
  let unseen = $state(0)
  let lastCount = $state(0)
  let announced = $state<string | null>(null)
  let freshId = $state<string | null>(null)
  let primedKey = ''
  let primedLast = ''

  $effect.pre(() => {
    const last = messages.at(-1)?.id ?? ''
    if (primedKey !== key) {
      primedKey = key
      primedLast = last
      freshId = null
      return
    }
    freshId = last && last !== primedLast ? last : null
    primedLast = last
  })

  $effect(() => {
    if (conversationId) void controller.loadMessages(conversationId)
  })

  $effect(() => {
    const count = messages.length
    const last = messages[count - 1]
    if (count > lastCount && last && last.sender.type !== 'USER' && !pinned) {
      unseen += count - lastCount
      announced = i18n.t('a11y.newMessage', {
        name: last.sender.name ?? i18n.t('sender.agentFallback')
      })
    }
    if (last?.delivery === 'failed') announced = i18n.t('a11y.messageFailed')
    lastCount = count
    if (pinned) queueMicrotask(scrollToEnd)
  })

  function scrollToEnd() {
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
    unseen = 0
    pinned = true
  }

  function onScroll() {
    if (!scroller) return
    pinned = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
    if (pinned) unseen = 0
  }

  function sameGroup(a: (typeof messages)[number], b: (typeof messages)[number]): boolean {
    if (a.kind === 'event' || b.kind === 'event') return false
    if (a.sender.type !== b.sender.type || a.sender.name !== b.sender.name) return false
    return Math.abs(Date.parse(a.createdAt) - Date.parse(b.createdAt)) <= 5 * 60_000
  }

  function showTime(index: number): boolean {
    const current = messages[index]
    const next = messages[index + 1]
    if (!current || current.kind === 'event') return false
    if (!next) return true
    return !sameGroup(current, next)
  }

  function dayLabel(index: number): string | null {
    const current = messages[index]
    if (!current) return null
    const prev = messages[index - 1]
    if (prev && i18n.formatDay(prev.createdAt) === i18n.formatDay(current.createdAt)) return null
    return i18n.formatDay(current.createdAt)
  }
</script>

<div class="thread">
  {#if conversation?.ticket}
    <div class="ticket">
      <span>{i18n.t('status.ticket', { id: conversation.ticket.id })}</span>
      <span class="status" style:color={statusColor(conversation.ticket.status.theme)}>
        {i18n.t('status.label', { status: conversation.ticket.status.label })}
      </span>
    </div>
  {/if}
  {#if availability.state === 'offline'}
    <div class="away" role="status">
      <svg class="moon" viewBox="0 0 18 18" aria-hidden="true">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8.54419 1.47446C8.70875 1.73227 8.70028 2.06417 8.52278 2.31324C7.88003 3.21522 7.5 4.31129 7.5 5.49999C7.5 8.53778 9.96222 11 13 11C14.0509 11 15.029 10.7009 15.8667 10.1868C16.1275 10.0267 16.4594 10.0412 16.7053 10.2233C16.9513 10.4054 17.0619 10.7186 16.9848 11.0148C16.0904 14.4535 12.9735 17 9.25 17C4.83179 17 1.25 13.4182 1.25 8.99999C1.25 5.08453 4.06262 1.83365 7.77437 1.14073C8.07502 1.0846 8.37963 1.21666 8.54419 1.47446Z"
          fill="currentColor"
        />
      </svg>
      <div>
        <p class="away-title">{awayTitle}</p>
        <p class="away-hint">{i18n.t('availability.offlineHint')}</p>
      </div>
    </div>
  {/if}

  <div bind:this={scroller} class="history" role="log" aria-live="polite" onscroll={onScroll}>
    {#if thread?.hasMore && conversationId}
      <button
        type="button"
        class="older"
        disabled={thread.loading}
        onclick={() => void controller.loadOlder(conversationId)}
      >
        {thread.loading ? i18n.t('thread.loading') : i18n.t('thread.loadOlder')}
      </button>
    {/if}

    {#if thread?.loading && !thread.loaded}
      <p class="state">{i18n.t('thread.loading')}</p>
    {:else if thread?.error && !messages.length}
      <div class="state">
        <p>{i18n.t('thread.error')}</p>
        <button
          type="button"
          class="older"
          onclick={() => void controller.loadMessages(conversationId ?? '')}
        >
          {i18n.t('thread.retryLoad')}
        </button>
      </div>
    {:else if conversationId && thread?.loaded && !conversation && !messages.length}
      <p class="state">{i18n.t('thread.notFound')}</p>
    {/if}

    {#if showStarter}
      <article class="starter">
        <div class="bubble">{i18n.t('conversationStarter')}</div>
        <p class="byline">{widget.config.team.name || i18n.t('sender.agentFallback')}</p>
      </article>
    {/if}

    {#each messages as message, index (message.id)}
      {@const day = dayLabel(index)}
      {#if day}
        <div class="day"><span>{day}</span></div>
      {/if}
      {#if message.kind === 'event'}
        <Event {message} {i18n} />
      {:else}
        <Bubble
          {message}
          {i18n}
          {controller}
          showTime={showTime(index)}
          arrive={message.id === freshId}
        />
      {/if}
    {/each}

    {#if typingText}
      <p class="typing">
        {typingText}
        <span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
      </p>
    {/if}
  </div>

  {#if unseen > 0}
    <button type="button" class="chip" onclick={scrollToEnd}>
      {i18n.t('thread.newMessages', { count: unseen })}
    </button>
  {/if}

  {#if showEmail}
    <EmailForm {controller} {i18n} />
  {/if}

  <Composer {controller} {widget} {conversationId} />
  {#if widget.config.branding.poweredBy}
    <PoweredBy {i18n} />
  {/if}
  <div class="tp-sr" aria-live="polite">{announced ?? ''}</div>
</div>

<style>
  .thread {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .ticket {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--tp-border);
    color: var(--tp-muted);
    font-size: 12px;
    font-weight: 600;
  }

  .status {
    font-weight: 700;
  }

  .away {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--tp-bubble);
    color: var(--tp-text);
  }

  .moon {
    flex: none;
    width: 20px;
    height: 20px;
    color: var(--tp-muted);
  }

  .away-title,
  .away-hint {
    margin: 0;
  }

  .away-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
  }

  .away-hint {
    margin-top: 2px;
    color: var(--tp-muted);
    font-size: 12px;
    line-height: 1.3;
  }

  .history {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 12px 16px;
  }

  .starter {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 86%;
  }

  .starter .bubble {
    padding: 10px 14px;
    border-radius: 18px;
    background: var(--tp-bubble);
  }

  .starter .byline {
    margin: 6px 4px 0;
    color: var(--tp-muted);
    font-size: 12px;
    line-height: 1.3;
  }

  .day {
    display: flex;
    justify-content: center;
  }

  .day span {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--tp-fill);
    color: var(--tp-muted);
    font-size: 11px;
    font-weight: 700;
  }

  .state,
  .typing {
    display: flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    margin: 8px 0;
    padding: 8px 12px;
    border-radius: 16px;
    border-end-start-radius: 4px;
    background: var(--tp-fill);
    color: var(--tp-muted);
    font-size: 13px;
  }

  .dots {
    display: inline-flex;
    gap: 2px;
  }

  .dots span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    animation: tp-typing 1.4s infinite;
  }

  .dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @media (prefers-reduced-motion: reduce) {
    .dots span {
      animation: none;
      opacity: 1;
    }
  }

  @keyframes tp-typing {
    0%,
    60%,
    100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }

  .older,
  .chip {
    border: 0;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .older {
    align-self: center;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    background: var(--tp-fill);
    color: var(--tp-text);
  }

  .chip {
    position: absolute;
    inset-inline: 0;
    bottom: 140px;
    width: max-content;
    max-width: calc(100% - 32px);
    margin-inline: auto;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    box-shadow: var(--tp-shadow);
  }

  .older:focus-visible,
  .chip:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }
</style>

<script lang="ts">
  import { NEW_CONVERSATION, type WidgetController, type WidgetState } from '@ticketping/core'
  import Event from '../message/Event.svelte'
  import Bubble from '../message/Bubble.svelte'
  import Composer from './Composer.svelte'
  import EmailForm from './EmailForm.svelte'
  import PoweredBy from './PoweredBy.svelte'
  import { createStickBottom } from '../lib/stick-bottom.ts'

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
  const hiddenEvents = $derived(
    widget.config.features.ai
      ? ['contact_requested', 'ticket_created']
      : ['contact_requested', 'ticket_created', 'handoff']
  )
  const visibleMessages = $derived(
    messages.filter((message) => !message.event || !hiddenEvents.includes(message.event.type))
  )
  const typing = $derived.by(() => {
    if (conversationId) return widget.typing[conversationId]
    const ids = Object.keys(widget.typing)
    const only = ids.length === 1 ? ids[0] : undefined
    return only ? widget.typing[only] : undefined
  })
  const showTyping = $derived(Boolean(typing) || widget.pendingReply[key] === true)
  const showEmail = $derived.by(() => {
    if (!widget.config.features.emailCapture || !conversation) return false
    if (widget.identity.contactEmail || widget.identity.email) return false
    return (
      conversation.phase === 'needs_contact' ||
      messages.some((message) => message.event?.type === 'contact_requested')
    )
  })
  const showStarter = $derived(
    !thread?.error && (conversationId === null || thread?.greeting === true)
  )
  const availability = $derived(widget.config.team.availability)
  const awayTitle = $derived.by(() => {
    if (availability.next) return i18n.t('availability.offlineBack', availability.next)
    if (availability.hours)
      return i18n.t('availability.offlineHours', { hours: availability.hours })
    return i18n.t('availability.offline')
  })

  let scroller: HTMLElement | undefined = $state()
  let feed: HTMLElement | undefined = $state()
  let pinned = $state(true)
  let unseen = $state(0)
  let lastCount = $state(0)
  let announced = $state<string | null>(null)
  let freshKey = $state<string | null>(null)
  let primedKey = ''
  let primedLast = ''
  let stickKey = ''
  const stick = createStickBottom()

  $effect.pre(() => {
    const last = visibleMessages.at(-1)
    const lastKey = last ? (last.clientId ?? last.id) : ''
    if (primedKey !== key) {
      primedKey = key
      if (lastKey && lastKey === primedLast) return
      primedLast = lastKey
      freshKey = null
      return
    }
    if (last && lastKey !== primedLast) freshKey = lastKey
    primedLast = lastKey
  })

  $effect(() => {
    if (conversationId) void controller.loadMessages(conversationId)
  })

  $effect(() => {
    const outer = scroller
    const inner = feed
    if (!outer || !inner) return
    stick.attach(outer, inner)
    return () => stick.release()
  })

  $effect(() => {
    const next = key
    const prev = stickKey
    stickKey = next
    if (prev === NEW_CONVERSATION && next !== NEW_CONVERSATION) return
    queueMicrotask(() => {
      unseen = 0
      pinned = true
      stick.jump()
    })
  })

  $effect(() => {
    const count = visibleMessages.length
    const last = visibleMessages[count - 1]
    void showTyping
    if (count > lastCount && last && last.sender.type !== 'USER' && !stick.pinned) {
      unseen += count - lastCount
      announced = i18n.t('a11y.newMessage', {
        name: last.sender.name ?? i18n.t('sender.agentFallback')
      })
    }
    if (last?.delivery === 'failed') announced = i18n.t('a11y.messageFailed')
    lastCount = count
    stick.follow()
  })

  function scrollToEnd() {
    unseen = 0
    pinned = true
    stick.ease()
  }

  function onScroll() {
    pinned = stick.onScroll()
    if (pinned) unseen = 0
  }

  function sameGroup(
    a: (typeof visibleMessages)[number],
    b: (typeof visibleMessages)[number]
  ): boolean {
    if (a.kind === 'event' || b.kind === 'event') return false
    if (a.sender.type !== b.sender.type || a.sender.name !== b.sender.name) return false
    return Math.abs(Date.parse(a.createdAt) - Date.parse(b.createdAt)) <= 5 * 60_000
  }

  function showTime(index: number): boolean {
    const current = visibleMessages[index]
    const next = visibleMessages[index + 1]
    if (!current || current.kind === 'event') return false
    if (!next) return true
    return !sameGroup(current, next)
  }

  function dayLabel(index: number): string | null {
    const current = visibleMessages[index]
    if (!current) return null
    const prev = visibleMessages[index - 1]
    if (!prev && showStarter) return null
    if (prev && i18n.formatDay(prev.createdAt) === i18n.formatDay(current.createdAt)) return null
    return i18n.formatDay(current.createdAt)
  }
</script>

<div class="thread">
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
    <div bind:this={feed} class="feed">
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

      {#each visibleMessages as message, index (message.clientId ?? message.id)}
        {@const day = dayLabel(index)}
        {@const prev = visibleMessages[index - 1]}
        {@const next = visibleMessages[index + 1]}
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
            arrive={(message.clientId ?? message.id) === freshKey}
            joinPrev={Boolean(!day && prev && sameGroup(prev, message))}
            joinNext={Boolean(next && !dayLabel(index + 1) && sameGroup(message, next))}
          />
        {/if}
      {/each}

      {#if showTyping}
        <article class="typing" role="status">
          <div class="bubble">
            <span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
          </div>
          <span class="tp-sr">{i18n.t('thread.typingSomeone')}</span>
        </article>
      {/if}
    </div>
  </div>

  {#if unseen > 0}
    <button type="button" class="chip" onclick={scrollToEnd}>
      {i18n.t('thread.newMessages', { count: unseen })}
    </button>
  {/if}

  {#if showEmail}
    <EmailForm {controller} {i18n} />
  {:else}
    <Composer {controller} {widget} {conversationId} />
  {/if}
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
    flex: 1;
    min-height: 0;
    overflow: auto;
    overflow-anchor: none;
    overscroll-behavior: contain;
    padding: 12px 16px;
  }

  .feed {
    display: flex;
    flex-direction: column;
    gap: 8px;
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

  .state {
    margin: 8px 0;
    color: var(--tp-muted);
    font-size: 13px;
  }

  .typing {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 86%;
    animation: tp-arrive 200ms var(--tp-ease-out) both;
  }

  .typing .bubble {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-radius: 18px;
    background: var(--tp-bubble);
  }

  .dots {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    height: 1.4em;
  }

  .dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--tp-muted);
    animation: tp-typing 1.4s infinite;
  }

  .dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @media (prefers-reduced-motion: reduce) {
    .typing {
      animation: none;
    }

    .dots span {
      animation: none;
      opacity: 1;
    }
  }

  @keyframes tp-arrive {
    from {
      opacity: 0;
      transform: scale(0.98);
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

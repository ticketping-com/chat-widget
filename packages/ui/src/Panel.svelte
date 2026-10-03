<script lang="ts">
  import { recentConversation, type WidgetController, type WidgetState } from '@ticketping/core'
  import { trapTab } from './lib/focus.ts'
  import ConnectionBanner from './screens/ConnectionBanner.svelte'
  import Home from './screens/Home.svelte'
  import Messages from './screens/Messages.svelte'
  import Thread from './screens/Thread.svelte'

  interface Props {
    controller: WidgetController
    widget: WidgetState
    open: boolean
  }

  const { controller, widget, open }: Props = $props()
  const i18n = $derived(widget.i18n)
  const team = $derived(widget.config.team.name)
  const title = $derived.by(() => {
    if (widget.view.name === 'messages') return i18n.t('list.title')
    if (widget.view.name === 'thread' && widget.view.conversationId === null) {
      return i18n.t('thread.newTitle')
    }
    return team || i18n.t('panel.labelNoTeam')
  })
  const inThread = $derived(widget.view.name === 'thread' && widget.view.conversationId !== null)
  const onHome = $derived(widget.view.name === 'home')
  const onLive = $derived(widget.view.name === 'thread' && widget.view.conversationId === null)
  const onHistory = $derived(widget.view.name === 'messages')
  const online = $derived(widget.config.team.availability.state !== 'offline')
  const handoffId = $derived.by(() => {
    const view = widget.view
    if (view.name !== 'thread' || !view.conversationId || !widget.config.features.ai) return null
    const conversation = widget.conversations.find((item) => item.id === view.conversationId)
    return conversation?.phase === 'ai' ? view.conversationId : null
  })

  function openLive() {
    const recent = recentConversation(widget.conversations)
    if (recent) controller.showConversation(recent.id)
    else controller.showNewMessage()
  }

  let panel: HTMLElement | undefined = $state()
  let nav = $state<'forward' | 'back' | 'none'>('none')
  let seen = ''

  $effect.pre(() => {
    const name = widget.view.name
    if (!open || !seen) {
      seen = name
      nav = 'none'
      return
    }
    if (name === seen) return
    const rank = (view: string) => (view === 'thread' ? 2 : view === 'messages' ? 1 : 0)
    nav = rank(name) >= rank(seen) ? 'forward' : 'back'
    seen = name
  })

  $effect(() => {
    panel?.focus({ preventScroll: true })
  })

  function back() {
    controller.showMessages()
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      controller.close()
      return
    }
    if (panel) trapTab(panel, event)
  }
</script>

<div
  bind:this={panel}
  class="panel"
  data-open={open}
  data-position={widget.config.appearance.position}
  role="dialog"
  aria-label={team ? i18n.t('panel.label', { team }) : i18n.t('panel.labelNoTeam')}
  data-view={widget.view.name}
  tabindex="-1"
  {onkeydown}
>
  <header class="header" data-chrome={inThread ? 'thread' : 'tabs'}>
    {#if inThread}
      <button type="button" class="icon-button" aria-label={i18n.t('panel.back')} onclick={back}>
        <svg viewBox="0 0 18 18" aria-hidden="true" class="flip-rtl">
          <polyline
            points="11.5 15.25 5.25 9 11.5 2.75"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
          />
        </svg>
      </button>
      <h2 class="title">
        {#if online}
          <span class="dot" title={i18n.t('availability.online')}></span>
        {/if}
        <span class="name">{title}</span>
      </h2>
      {#if handoffId}
        <button type="button" class="handoff" onclick={() => controller.handoff(handoffId)}>
          {i18n.t('handoff.button')}
        </button>
      {/if}
    {:else}
      <nav class="switch" aria-label={i18n.t('panel.labelNoTeam')}>
        <button
          type="button"
          class="pill"
          aria-current={onHome ? 'page' : undefined}
          onclick={() => controller.showHome()}
        >
          {i18n.t('home.nav.home')}
        </button>
        <button
          type="button"
          class="pill"
          aria-current={onLive ? 'page' : undefined}
          onclick={openLive}
        >
          {i18n.t('home.nav.live')}
        </button>
        <button
          type="button"
          class="pill"
          aria-current={onHistory ? 'page' : undefined}
          onclick={() => controller.showMessages()}
        >
          {i18n.t('home.nav.messages')}
        </button>
      </nav>
    {/if}
    <button
      type="button"
      class="icon-button"
      aria-label={i18n.t('panel.close')}
      onclick={() => controller.close()}
    >
      <svg viewBox="0 0 18 18" aria-hidden="true">
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
    </button>
  </header>
  <ConnectionBanner connection={widget.connection} {i18n} />
  <div class="body">
    {#key widget.view.name}
      <div class="screen" data-nav={nav}>
        {#if widget.view.name === 'messages'}
          <Messages {controller} {widget} />
        {:else if widget.view.name === 'thread'}
          <Thread {controller} {widget} conversationId={widget.view.conversationId} />
        {:else}
          <Home {controller} {widget} />
        {/if}
      </div>
    {/key}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    width: 380px;
    height: min(640px, calc(100vh - 120px));
    margin-block-end: 16px;
    overflow: hidden;
    border-radius: 16px;
    background: var(--tp-surface);
    color: var(--tp-text);
    box-shadow: var(--tp-shadow);
    outline: none;
    transform: scale(0.8);
    transform-origin: bottom right;
    opacity: 0;
    pointer-events: none;
    transition:
      transform 200ms var(--tp-ease-out),
      opacity 160ms ease;
  }

  .panel[data-position='bottom-left'] {
    transform-origin: bottom left;
  }

  .panel[data-open='true'] {
    transform: scale(1);
    opacity: 1;
    pointer-events: auto;
    transition:
      transform 300ms cubic-bezier(0, 1.2, 1, 1),
      opacity 300ms var(--tp-ease-out);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    padding: 8px 8px 8px 12px;
    background: var(--tp-surface);
    color: var(--tp-text);
  }

  .header[data-chrome='tabs'] {
    position: relative;
    justify-content: center;
    padding-inline: 44px;
  }

  .header[data-chrome='thread'] {
    border-bottom: 1px solid var(--tp-border);
  }

  .header[data-chrome='tabs'] .icon-button {
    position: absolute;
    inset-inline-end: 8px;
  }

  .switch {
    display: flex;
    align-items: center;
    padding: 3px;
    border-radius: 999px;
    background: var(--tp-segment);
  }

  .pill {
    height: 28px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--tp-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 180ms var(--tp-ease-out),
      box-shadow 180ms var(--tp-ease-out),
      color 180ms var(--tp-ease-out);
  }

  .pill[aria-current='page'] {
    background: var(--tp-segment-on);
    color: var(--tp-text);
    box-shadow:
      0 1px 1px oklch(13% 0.028 261.692 / 0.06),
      0 2px 6px oklch(13% 0.028 261.692 / 0.1);
  }

  .pill:hover:not([aria-current='page']) {
    color: color-mix(in oklab, var(--tp-text) 72%, var(--tp-muted));
  }

  .pill:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }

  .title {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .name {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(72.3% 0.219 149.579);
    box-shadow: 0 0 0 3px color-mix(in oklab, oklch(72.3% 0.219 149.579) 22%, transparent);
  }

  .handoff {
    flex: none;
    height: 32px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--tp-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 160ms var(--tp-ease-out);
  }

  .handoff:hover {
    background: var(--tp-bubble);
  }

  .handoff:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }

  .icon-button {
    display: grid;
    flex: none;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition:
      transform 160ms var(--tp-ease-out),
      background-color 160ms var(--tp-ease-out);
  }

  .icon-button:hover {
    background: var(--tp-bubble);
  }

  .icon-button:active {
    transform: scale(0.96);
  }

  .icon-button:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }

  .icon-button svg {
    width: 18px;
    height: 18px;
  }

  :global([dir='rtl']) .flip-rtl {
    transform: scaleX(-1);
  }

  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .screen {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .screen[data-nav='forward'] {
    animation: tp-forward 220ms var(--tp-ease-out);
  }

  .screen[data-nav='back'] {
    animation: tp-back 220ms var(--tp-ease-out);
  }

  @keyframes tp-forward {
    from {
      opacity: 0;
      transform: translateX(calc(16px * var(--tp-nav, 1)));
    }
  }

  @keyframes tp-back {
    from {
      opacity: 0;
      transform: translateX(calc(-16px * var(--tp-nav, 1)));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel,
    .screen,
    .icon-button,
    .handoff,
    .pill {
      transition: none;
      animation: none;
    }

    .panel {
      transform: none;
      opacity: 1;
    }
  }

  @media (max-width: 480px) {
    .panel {
      position: absolute;
      inset: 0;
      width: auto;
      height: auto;
      margin: 0;
      border-radius: 0;
      transform: translateY(16px);
      transform-origin: center bottom;
    }

    .panel[data-open='true'] {
      transform: none;
    }

    .header {
      padding-top: calc(8px + env(safe-area-inset-top, 0px));
    }

    .icon-button {
      width: 44px;
      height: 44px;
    }
  }

  @media (max-width: 480px) and (prefers-reduced-motion: reduce) {
    .panel {
      transform: none;
    }
  }
</style>

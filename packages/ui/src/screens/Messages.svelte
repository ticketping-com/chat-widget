<script lang="ts">
  import { conversationTitle, type WidgetController, type WidgetState } from '@ticketping/core'

  interface Props {
    controller: WidgetController
    widget: WidgetState
  }

  const { controller, widget }: Props = $props()
  const i18n = $derived(widget.i18n)
  const empty = $derived(!widget.conversations.length && !widget.conversationsLoading)

  function startChat() {
    controller.showNewMessage()
  }
</script>

<div class="list">
  <div class="scroll">
    {#if widget.lastError && !widget.conversations.length}
      <p class="state">{i18n.t('list.error')}</p>
    {:else if empty}
      <div class="empty">
        <p>{i18n.t('list.empty')}</p>
        <p>{i18n.t('list.emptyBody')}</p>
      </div>
    {:else}
      <ul>
        {#each widget.conversations as conversation (conversation.id)}
          <li>
            <button
              type="button"
              class="row"
              onclick={() => controller.showConversation(conversation.id)}
            >
              <span class="main">
                <span class="line">
                  <span class="preview">
                    {conversationTitle(conversation, i18n)}
                  </span>
                  {#if conversation.isTest}
                    <span class="test" title={i18n.t('test.tagTitle')}>{i18n.t('test.tag')}</span>
                  {/if}
                </span>
                <span class="when">{i18n.formatRelative(conversation.updatedAt)}</span>
              </span>
              {#if conversation.unreadCount > 0}
                <span class="badge"
                  >{i18n.t('list.unread', { count: conversation.unreadCount })}</span
                >
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if widget.conversationsLoading}
      <p class="state">{i18n.t('list.loading')}</p>
    {:else if widget.conversationsHasMore}
      <button type="button" class="more" onclick={() => void controller.loadMoreConversations()}>
        {i18n.t('list.loadMore')}
      </button>
    {/if}
  </div>

  <div class="dock">
    <button type="button" class="new" onclick={startChat}>
      {i18n.t('list.newConversation')}
    </button>
  </div>
</div>

<style>
  .list {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    border: 0;
    border-bottom: 1px solid var(--tp-border);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .line {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .preview {
    overflow: hidden;
    min-width: 0;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .when {
    color: var(--tp-muted);
    font-size: 12px;
  }

  .badge {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--tp-danger);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
  }

  .test {
    flex: none;
    padding: 0 5px;
    border-radius: 4px;
    background: color-mix(in oklab, var(--tp-focus) 16%, transparent);
    color: var(--tp-focus);
    font-size: 10px;
    font-weight: 800;
  }

  .state {
    margin: 24px 16px;
    color: var(--tp-muted);
    text-align: center;
  }

  .empty {
    display: grid;
    flex: 1;
    place-items: center;
    align-content: center;
    padding: 24px 32px;
    color: var(--tp-muted);
    text-align: center;
  }

  .empty p {
    margin: 0;
  }

  .empty p:first-child {
    margin-bottom: 4px;
    color: var(--tp-text);
  }

  .more {
    display: block;
    width: calc(100% - 32px);
    min-height: 40px;
    margin: 12px 16px;
    border: 0;
    border-radius: 10px;
    background: var(--tp-fill);
    color: var(--tp-text);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .dock {
    flex: none;
    padding: 12px 16px 16px;
  }

  .new {
    width: 100%;
    height: 48px;
    border: 0;
    border-radius: 999px;
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 160ms var(--tp-ease-out);
  }

  .new:hover {
    transform: translateY(-1px);
  }

  .new:active {
    transform: scale(0.96);
  }

  .row:focus-visible,
  .more:focus-visible,
  .new:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }
</style>

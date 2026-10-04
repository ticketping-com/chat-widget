<script lang="ts">
  import { conversationTitle, type WidgetController, type WidgetState } from '@ticketping/core'
  import Greeting from './Greeting.svelte'
  import PoweredBy from './PoweredBy.svelte'

  interface Props {
    controller: WidgetController
    widget: WidgetState
  }

  const { controller, widget }: Props = $props()
  const i18n = $derived(widget.i18n)
  const latest = $derived(widget.conversations[0] ?? null)
  const hint = $derived(widget.config.team.replyTimeHint)
</script>

<div class="home">
  <div class="stage">
    <div class="intro">
      <Greeting {i18n} />
    </div>
    <div class="cards">
      {#if latest}
        <button type="button" class="card" onclick={() => controller.showConversation(latest.id)}>
          <span class="kicker">{i18n.t('home.recent')}</span>
          <span class="line">
            <span class="preview">
              {conversationTitle(latest, i18n)}
            </span>
            {#if latest.isTest}
              <span class="test" title={i18n.t('test.tagTitle')}>{i18n.t('test.tag')}</span>
            {/if}
          </span>
          <time class="when" datetime={latest.updatedAt}
            >{i18n.formatRelative(latest.updatedAt)}</time
          >
        </button>
      {/if}
      <button type="button" class="card send" onclick={() => controller.showNewMessage()}>
        <span class="send-copy">
          <span class="send-title">{i18n.t('home.newMessage')}</span>
          {#if hint}
            <span class="hint">{hint}</span>
          {/if}
        </span>
        <svg class="plane" viewBox="0 0 18 18" aria-hidden="true">
          <line
            x1="9.386"
            y1="9"
            x2="4.993"
            y2="9"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
          />
          <path
            d="M15.472,9.458L4.005,15.412c-.404,.21-.863-.168-.733-.605l1.721-5.807L3.272,3.193c-.129-.437,.329-.815,.733-.605l11.466,5.954c.371,.193,.371,.724,0,.917Z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1"
          />
        </svg>
      </button>
    </div>
  </div>
  {#if widget.config.branding.poweredBy}
    <PoweredBy {i18n} />
  {/if}
</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .stage {
    --card-text-inset: 19px;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 20px 20px 16px;
  }

  .intro {
    padding-inline: var(--card-text-inset);
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    width: 100%;
    padding: 16px calc(var(--card-text-inset) - 1px);
    border: 1px solid var(--tp-border);
    border-radius: 16px;
    background: var(--tp-surface);
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
    transition:
      background-color 160ms var(--tp-ease-out),
      transform 160ms var(--tp-ease-out);
  }

  .card:hover {
    background: var(--tp-fill);
  }

  .card:active {
    transform: scale(0.98);
  }

  .card:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }

  .kicker {
    color: var(--tp-muted);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .line {
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    min-width: 0;
  }

  .preview,
  .send-title {
    color: color-mix(in oklab, var(--tp-text) 78%, var(--tp-muted));
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }

  .preview {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .when,
  .hint {
    color: var(--tp-muted);
    font-weight: 500;
    line-height: 1.3;
  }

  .when {
    font-size: 14px;
  }

  .hint {
    font-size: 13px;
  }

  .send {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .send-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .plane {
    flex: none;
    width: 22px;
    height: 22px;
    color: color-mix(in oklab, var(--tp-text) 55%, var(--tp-muted));
  }

  .test {
    flex: none;
    padding: 0 5px;
    border-radius: 4px;
    background: color-mix(in oklab, var(--tp-focus) 16%, transparent);
    color: var(--tp-focus);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }
</style>

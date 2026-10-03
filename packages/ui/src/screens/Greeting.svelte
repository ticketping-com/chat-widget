<script lang="ts">
  import type { I18n } from '@ticketping/core'

  interface Props {
    i18n: I18n
  }

  const { i18n }: Props = $props()
</script>

<div class="greet">
  <p class="title">{i18n.t('greetingTitle')}</p>
  <p class="body">{i18n.t('greetingBody')}</p>
</div>

<style>
  .greet {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: start;
  }

  .title,
  .body {
    margin: 0;
    font-size: 26px;
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }

  .title {
    color: var(--tp-muted);
  }

  .body {
    margin-top: 2px;
    color: color-mix(in oklab, var(--tp-text) 88%, var(--tp-muted));
  }
</style>

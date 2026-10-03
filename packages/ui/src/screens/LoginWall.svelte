<script lang="ts">
  import type { I18n } from '@ticketping/core'

  interface Props {
    i18n: I18n
    loginUrl: string | null
  }

  const { i18n, loginUrl }: Props = $props()
</script>

<section class="login">
  <h3>{i18n.t('login.title')}</h3>
  <p>{i18n.t('login.body')}</p>
  {#if loginUrl}
    <a class="cta" href={loginUrl}>{i18n.t('login.button')}</a>
  {:else}
    <span class="cta disabled">{i18n.t('login.button')}</span>
  {/if}
</section>

<style>
  .login {
    padding: 16px;
    text-align: center;
  }

  h3 {
    margin: 0 0 6px;
    font-size: 16px;
  }

  p {
    margin: 0 0 12px;
    color: var(--tp-muted);
  }

  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 10px;
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    font-weight: 600;
    text-decoration: none;
  }

  .cta.disabled {
    opacity: 0.5;
  }

  .cta:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }
</style>

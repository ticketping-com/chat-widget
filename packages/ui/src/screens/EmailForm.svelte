<script lang="ts">
  import { isTicketpingError, type I18n, type WidgetController } from '@ticketping/core'
  import { isValidEmail } from '../lib/email.ts'

  interface Props {
    controller: WidgetController
    i18n: I18n
  }

  const { controller, i18n }: Props = $props()
  let email = $state('')
  let saving = $state(false)
  let error = $state('')
  let saved = $state('')

  async function submit(event: Event) {
    event.preventDefault()
    const value = email.trim()
    if (!isValidEmail(value)) {
      error = i18n.t('email.invalid')
      return
    }
    saving = true
    error = ''
    try {
      await controller.saveContact(value)
      saved = value
    } catch (err) {
      error = isTicketpingError(err, 'invalid_email')
        ? i18n.t('email.invalid')
        : i18n.t('email.error')
    } finally {
      saving = false
    }
  }
</script>

{#if saved}
  <p class="note" role="status">{i18n.t('email.saved', { email: saved })}</p>
{:else}
  <form class="form" onsubmit={submit}>
    <h3>{i18n.t('email.title')}</h3>
    <p>{i18n.t('email.body')}</p>
    <label>
      <span class="tp-sr">{i18n.t('email.label')}</span>
      <input
        class="field"
        type="email"
        name="email"
        autocomplete="email"
        placeholder={i18n.t('email.placeholder')}
        bind:value={email}
        disabled={saving}
        aria-invalid={error ? 'true' : undefined}
      />
    </label>
    {#if error}
      <p class="err" role="alert">{error}</p>
    {/if}
    <button type="submit" class="save" disabled={saving}>
      {saving ? i18n.t('email.saving') : i18n.t('email.submit')}
    </button>
  </form>
{/if}

<style>
  .form,
  .note {
    margin: 8px 16px 4px;
    padding: 12px;
    border: 1px solid var(--tp-border);
    border-radius: 12px;
    background: var(--tp-fill);
  }

  h3 {
    margin: 0 0 4px;
    font-size: 14px;
  }

  p {
    margin: 0 0 10px;
    color: var(--tp-muted);
    font-size: 13px;
  }

  .field {
    width: 100%;
    height: 44px;
    padding: 0 10px;
    border: 1px solid var(--tp-border);
    border-radius: 8px;
    background: var(--tp-surface);
    color: var(--tp-text);
    font: inherit;
    font-size: 16px;
  }

  .field:focus-visible,
  .save:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }

  .err {
    color: var(--tp-danger);
  }

  .save {
    margin-top: 8px;
    height: 36px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    background: var(--tp-accent);
    color: var(--tp-on-accent);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .save:disabled {
    opacity: 0.6;
  }

  .note {
    margin-bottom: 8px;
    color: var(--tp-text);
    font-size: 13px;
  }
</style>

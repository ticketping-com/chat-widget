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
  const valid = $derived(isValidEmail(email.trim()))

  function onAutofill(event: AnimationEvent) {
    if (event.animationName !== 'tp-autofill') return
    email = (event.currentTarget as HTMLInputElement).value
  }

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
  <form class="email" onsubmit={submit}>
    <h3>{i18n.t('email.title')}</h3>
    <p class="body">{i18n.t('email.body')}</p>
    <div class="field">
      <label class="wrap">
        <span class="tp-sr">{i18n.t('email.label')}</span>
        <input
          class="input"
          type="email"
          name="email"
          autocomplete="email"
          placeholder={i18n.t('email.placeholder')}
          bind:value={email}
          disabled={saving}
          aria-invalid={error ? 'true' : undefined}
          onanimationstart={onAutofill}
        />
      </label>
      {#if valid}
        <button type="submit" class="save" disabled={saving}>
          {saving ? i18n.t('email.saving') : i18n.t('email.submit')}
        </button>
      {/if}
    </div>
    {#if error}
      <p class="err" role="alert">{error}</p>
    {/if}
  </form>
{/if}

<style>
  .email,
  .note {
    padding: 0 12px 8px;
    background: var(--tp-surface);
  }

  h3 {
    margin: 0 2px;
    color: var(--tp-text);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
  }

  .body {
    margin: 2px 2px 8px;
    color: var(--tp-muted);
    font-size: 13px;
    font-style: italic;
    font-weight: 500;
    line-height: 1.35;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 4px 4px 4px 14px;
    border: 1px solid var(--tp-border);
    border-radius: 22px;
    overflow: hidden;
    background: var(--tp-surface);
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.04);
    transition:
      border-color 160ms var(--tp-ease-out),
      box-shadow 160ms var(--tp-ease-out);
  }

  .field:focus-within {
    border-color: color-mix(in oklab, var(--tp-accent) 55%, var(--tp-border));
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--tp-accent) 14%, transparent);
  }

  .wrap {
    flex: 1;
    min-width: 0;
  }

  .input {
    display: block;
    width: 100%;
    min-height: 36px;
    padding: 8px 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--tp-text);
    font: inherit;
    font-size: 16px;
    border-radius: inherit;
  }

  .input::placeholder {
    color: var(--tp-muted);
  }

  /* Chrome paints a yellow/grey fill that ignores the pill. Cover it with the surface. */
  .input:-webkit-autofill,
  .input:-webkit-autofill:hover,
  .input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--tp-text);
    caret-color: var(--tp-text);
    box-shadow: 0 0 0 1000px var(--tp-surface) inset;
    transition: background-color 99999s ease-out;
    animation: tp-autofill 0.01s;
  }

  @keyframes tp-autofill {
    to {
      opacity: 1;
    }
  }

  .save {
    flex: none;
    height: 32px;
    padding: 0 14px;
    border: 0;
    border-radius: 16px;
    background: var(--tp-text);
    color: var(--tp-surface);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    animation: tp-save-in 220ms var(--tp-ease-out);
    transition: transform 160ms var(--tp-ease-out);
  }

  .save:active:not(:disabled) {
    transform: scale(0.96);
  }

  .save:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .save:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }

  @keyframes tp-save-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .save {
      animation: none;
    }
  }

  .err {
    margin: 8px 4px 0;
    color: var(--tp-danger);
    font-size: 12px;
  }

  .note {
    margin: 0;
    color: var(--tp-text);
    font-size: 13px;
    line-height: 1.4;
  }

  @media (max-width: 480px) {
    .email,
    .note {
      padding-bottom: calc(8px + var(--tp-safe-bottom, env(safe-area-inset-bottom, 0px)));
    }

    .save {
      min-height: 36px;
    }
  }
</style>

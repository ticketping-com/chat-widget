<script lang="ts">
  import {
    MAX_MESSAGE_LENGTH,
    isTicketpingError,
    type FileAttachment,
    type GifResult,
    type WidgetController,
    type WidgetState
  } from '@ticketping/core'
  import { colonQuery, loadEmoji, searchEmoji, type Emoji } from '../lib/emoji.ts'
  import {
    canSend,
    FILE_ACCEPT,
    filesFromPaste,
    formatMaxSize,
    messageTooLong,
    takeFiles
  } from '../lib/files.ts'
  import { isMobileLayout } from '../lib/viewport.ts'
  import LoginWall from './LoginWall.svelte'

  interface Pending {
    key: string
    name: string
    file: File
    progress: number
    attachment?: FileAttachment
    error?: string
  }

  interface Props {
    controller: WidgetController
    widget: WidgetState
    conversationId: string | null
    onSent?: () => void
  }

  const { controller, widget, conversationId, onSent }: Props = $props()
  const i18n = $derived(widget.i18n)
  const features = $derived(widget.config.features)
  const offline = $derived(widget.connection === 'offline')

  let text = $state('')
  let pending = $state<Pending[]>([])
  let fileError = $state('')
  let picker = $state<'emoji' | 'gif' | null>(null)
  let dragging = $state(false)
  let area: HTMLTextAreaElement | undefined = $state()
  let fileInput: HTMLInputElement | undefined = $state()
  let suggestions = $state.raw<Emoji[]>([])
  let suggestStart = $state(-1)
  let EmojiPicker = $state<typeof import('../pickers/EmojiPicker.svelte').default | null>(null)
  let GifPicker = $state<typeof import('../pickers/GifPicker.svelte').default | null>(null)
  let lastKey = $state<string | null>(null)
  let fileSeq = 0
  let focusedNew = false

  const ready = $derived(pending.filter((item) => item.attachment))
  const uploading = $derived(pending.some((item) => !item.attachment && !item.error))
  const sendable = $derived(canSend(text, ready.length, false) && !uploading && !offline)
  const tooLong = $derived(messageTooLong(text))

  $effect(() => {
    const key = conversationId ?? 'new'
    if (lastKey === key) return
    lastKey = key
    text = ''
    pending = []
    fileError = ''
    picker = null
    suggestions = []
    if (conversationId === null) {
      const prefill = controller.consumePrefill()
      if (prefill) text = prefill
    }
  })

  $effect(() => {
    const isNew = conversationId === null && !offline && !widget.loginRequired
    if (!isNew) {
      focusedNew = false
      return
    }
    if (!area || focusedNew) return
    focusedNew = true
    // Desktop: focus so typing can start. Mobile: leave it alone so the keyboard
    // does not cover the sheet the moment the launcher opens.
    if (isMobileLayout()) return
    const input = area
    queueMicrotask(() => {
      input.focus({ preventScroll: true })
    })
  })

  $effect(() => {
    if (picker !== 'emoji' || EmojiPicker) return
    void import('../pickers/EmojiPicker.svelte').then((mod) => {
      EmojiPicker = mod.default
    })
  })

  $effect(() => {
    if (picker !== 'gif' || GifPicker) return
    void import('../pickers/GifPicker.svelte').then((mod) => {
      GifPicker = mod.default
    })
  })

  function onInput() {
    if (conversationId) controller.setTyping(conversationId, true)
    const caret = area?.selectionStart ?? text.length
    const colon = features.emoji ? colonQuery(text, caret) : null
    if (!colon) {
      suggestions = []
      suggestStart = -1
      return
    }
    suggestStart = colon.start
    void loadEmoji().then((list) => {
      suggestions = searchEmoji(list, colon.query, 6)
    })
  }

  function insertEmoji(emoji: string) {
    if (suggestStart >= 0) {
      const caret = area?.selectionStart ?? text.length
      text = `${text.slice(0, suggestStart)}${emoji} ${text.slice(caret)}`
      suggestStart = -1
      suggestions = []
    } else {
      text += emoji
    }
    area?.focus()
  }

  function rejectMessage(item: {
    name: string
    reason: 'tooLarge' | 'tooMany' | 'typeNotAllowed'
  }) {
    if (item.reason === 'tooLarge') {
      return i18n.t('attachments.tooLarge', { name: item.name, max: formatMaxSize() })
    }
    if (item.reason === 'tooMany') return i18n.t('attachments.tooMany', { max: 5 })
    return i18n.t('attachments.typeNotAllowed', { name: item.name })
  }

  function queueFiles(list: Iterable<File>) {
    if (!features.attachments) return
    const current = pending.filter((item) => !item.error).length
    const { accepted, rejected } = takeFiles(list, current)
    fileError = rejected[0] ? rejectMessage(rejected[0]) : ''
    for (const file of accepted) {
      const key = `${file.name}:${file.size}:${file.lastModified}:${fileSeq++}`
      const item: Pending = { key, name: file.name, file, progress: 0 }
      pending = [...pending, item]
      void controller
        .uploadFile(file, {
          name: file.name,
          onProgress: (fraction) => {
            pending = pending.map((row) =>
              row.key === key ? { ...row, progress: Math.round(fraction * 100) } : row
            )
          }
        })
        .then((attachment) => {
          pending = pending.map((row) =>
            row.key === key ? { ...row, attachment, progress: 100 } : row
          )
        })
        .catch((err) => {
          const message = isTicketpingError(err, 'file_too_large')
            ? i18n.t('attachments.tooLarge', { name: file.name, max: formatMaxSize() })
            : isTicketpingError(err, 'file_type_not_allowed')
              ? i18n.t('attachments.typeNotAllowed', { name: file.name })
              : i18n.t('attachments.uploadFailed', { name: file.name })
          pending = pending.map((row) => (row.key === key ? { ...row, error: message } : row))
        })
    }
  }

  function send(gif?: GifResult) {
    if (offline || widget.loginRequired) return
    if (tooLong) return
    const attachments = ready
      .map((item) => item.attachment)
      .filter((item): item is FileAttachment => !!item)
    if (!canSend(text, attachments.length, Boolean(gif))) return
    try {
      controller.send({
        conversationId,
        text,
        attachments,
        ...(gif ? { gif } : {})
      })
      text = ''
      pending = []
      fileError = ''
      picker = null
      suggestions = []
      onSent?.()
      area?.focus({ preventScroll: true })
    } catch {
      fileError = i18n.t('error.generic')
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229)
      return
    event.preventDefault()
    send()
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    if (event.dataTransfer?.files) queueFiles(event.dataTransfer.files)
  }

  // Paste bubbles from the composer and from the thread, but not from the host page.
  $effect(() => {
    if (!features.attachments || !area) return
    const root = area.getRootNode()
    if (!(root instanceof ShadowRoot)) return
    const onPaste = (event: Event) => {
      if (!(event instanceof ClipboardEvent)) return
      const files = filesFromPaste(event.clipboardData)
      if (!files.length) return
      event.preventDefault()
      queueFiles(files)
    }
    root.addEventListener('paste', onPaste)
    return () => root.removeEventListener('paste', onPaste)
  })
</script>

{#if widget.loginRequired}
  <LoginWall {i18n} loginUrl={widget.config.security.loginUrl} />
{:else}
  <div
    class="composer"
    class:offline
    role="group"
    aria-label={i18n.t('composerPlaceholder')}
    ondragenter={(event) => {
      event.preventDefault()
      if (features.attachments) dragging = true
    }}
    ondragover={(event) => event.preventDefault()}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
  >
    {#if offline}
      <p class="banner">{i18n.t('composer.disabledOffline')}</p>
    {/if}
    {#if dragging}
      <p class="drop">{i18n.t('composer.dropFiles')}</p>
    {/if}
    {#if pending.length}
      <ul class="files">
        {#each pending as item (item.key)}
          <li>
            {#if item.error}
              {item.error}
            {:else if item.attachment}
              {i18n.t('composer.uploaded', { name: item.name })}
            {:else}
              {i18n.t('composer.uploading', { name: item.name, percent: item.progress })}
            {/if}
            <button
              type="button"
              aria-label={i18n.t('composer.removeAttachment', { name: item.name })}
              onclick={() => (pending = pending.filter((row) => row.key !== item.key))}
            >
              ×
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if fileError}
      <p class="err" role="alert">{fileError}</p>
    {/if}
    {#if tooLong}
      <p class="err" role="alert">{i18n.t('composer.tooLong', { max: MAX_MESSAGE_LENGTH })}</p>
    {/if}
    {#if suggestions.length}
      <ul class="suggest" role="listbox" aria-label={i18n.t('emoji.suggestions')}>
        {#each suggestions as emoji (emoji.hexcode)}
          <li>
            <button type="button" onclick={() => insertEmoji(emoji.emoji)}>{emoji.emoji}</button>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="field">
      <textarea
        bind:this={area}
        bind:value={text}
        class="input"
        rows="1"
        maxlength={MAX_MESSAGE_LENGTH + 200}
        placeholder={i18n.t('composerPlaceholder')}
        disabled={offline}
        oninput={onInput}
        onkeydown={onKeydown}></textarea>
      <div class="tools">
        {#if features.attachments}
          <button
            type="button"
            class="icon"
            aria-label={i18n.t('composer.attach')}
            disabled={offline}
            onclick={() => fileInput?.click()}
          >
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <line
                x1="13.75"
                y1="1.75"
                x2="13.75"
                y2="6.75"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <line
                x1="16.25"
                y1="4.25"
                x2="11.25"
                y2="4.25"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <path
                d="M5.75,5v6.75c0,.828,.672,1.5,1.5,1.5h0c.828,0,1.5-.672,1.5-1.5V4.75c0-1.657-1.343-3-3-3h0c-1.657,0-3,1.343-3,3v7c0,2.485,2.015,4.5,4.5,4.5h0c2.485,0,4.5-2.015,4.5-4.5v-3"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
            </svg>
          </button>
          <input
            bind:this={fileInput}
            class="tp-sr"
            type="file"
            multiple
            accept={FILE_ACCEPT}
            onchange={() => {
              if (fileInput?.files) queueFiles(fileInput.files)
              if (fileInput) fileInput.value = ''
            }}
          />
        {/if}
        {#if features.emoji}
          <button
            type="button"
            class="icon"
            aria-label={i18n.t('composer.emoji')}
            aria-expanded={picker === 'emoji'}
            disabled={offline}
            onclick={() => (picker = picker === 'emoji' ? null : 'emoji')}
          >
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <circle
                cx="9"
                cy="9"
                r="7.25"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <path
                d="M11.25,11.758c-.472,.746-1.304,1.242-2.25,1.242s-1.778-.496-2.25-1.242"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <circle cx="6" cy="9" r="1" fill="currentColor" />
              <circle cx="12" cy="9" r="1" fill="currentColor" />
            </svg>
          </button>
        {/if}
        {#if features.gifs}
          <button
            type="button"
            class="icon"
            aria-label={i18n.t('composer.gif')}
            aria-expanded={picker === 'gif'}
            disabled={offline}
            onclick={() => (picker = picker === 'gif' ? null : 'gif')}
          >
            <svg viewBox="0 0 18 18" aria-hidden="true">
              <line
                x1="9.25"
                y1="9.75"
                x2="9.25"
                y2="15.75"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <polyline
                points="12.25 15.75 12.25 9.75 15.75 9.75"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <line
                x1="12.25"
                y1="12.75"
                x2="15.5"
                y2="12.75"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <path
                d="m5,13.25h1.75c-.0685,1.5748-.855,2.5-2.25,2.5-1.3742,0-2.25-1.3433-2.25-3s.8758-3,2.25-3c.8441,0,1.5003.507,1.8806,1.2821"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <path
                d="m15.16,6.75h-3.41c-.552,0-1-.448-1-1v-3.398"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
              <path
                d="m2.75,6.75v-2.5c0-1.105.895-2,2-2h5.586c.265,0,.52.105.707.293l3.914,3.914c.0857.0857.1541.185.2032.2929"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
              />
            </svg>
          </button>
        {/if}
        <button
          type="button"
          class="send"
          aria-label={i18n.t('composer.send')}
          disabled={!sendable}
          onclick={() => send()}
        >
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <line
              x1="9"
              y1="2.75"
              x2="9"
              y2="13.75"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
            />
            <polyline
              points="4.75 7 9 2.75 13.25 7"
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
    {#if picker === 'emoji' && EmojiPicker}
      <EmojiPicker {i18n} onPick={insertEmoji} onClose={() => (picker = null)} />
    {/if}
    {#if picker === 'gif' && GifPicker}
      <GifPicker
        {controller}
        {i18n}
        preview={widget.preview}
        onPick={(gif) => send(gif)}
        onClose={() => (picker = null)}
      />
    {/if}
  </div>
{/if}

<style>
  .composer {
    position: relative;
    padding: 0 12px 8px;
    background: var(--tp-surface);
  }

  .banner,
  .drop,
  .err {
    margin: 0;
    padding: 8px 12px 0;
    font-size: 12px;
  }

  .banner,
  .drop {
    color: var(--tp-muted);
  }

  .drop {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    background: color-mix(in oklab, var(--tp-accent) 16%, var(--tp-surface));
    font-size: 14px;
    font-weight: 600;
  }

  .err {
    color: var(--tp-danger);
  }

  .files {
    margin: 8px 12px 0;
    padding: 0;
    list-style: none;
  }

  .files li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
    padding: 6px 8px;
    border-radius: 8px;
    background: var(--tp-fill);
    font-size: 12px;
  }

  .files button {
    border: 0;
    background: none;
    color: var(--tp-muted);
    cursor: pointer;
  }

  .suggest {
    display: flex;
    gap: 4px;
    margin: 8px 12px 0;
    padding: 0;
    list-style: none;
  }

  .suggest button {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 8px;
    background: var(--tp-fill);
    font-size: 20px;
    cursor: pointer;
  }

  .field {
    border: 1px solid var(--tp-border);
    border-radius: 22px;
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

  .input {
    display: block;
    width: 100%;
    min-height: 44px;
    max-height: 120px;
    padding: 12px 14px 0;
    resize: none;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--tp-text);
    font: inherit;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    .composer {
      padding-bottom: calc(8px + var(--tp-safe-bottom, env(safe-area-inset-bottom, 0px)));
    }

    .icon,
    .send,
    .suggest button,
    .files button {
      min-width: 44px;
      min-height: 44px;
    }
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0;
    padding-block: 4px 6px;
    padding-inline: 8px 6px;
  }

  .icon,
  .send {
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
  }

  .send svg {
    width: 18px;
    height: 18px;
  }

  .send:active:not(:disabled) {
    transform: scale(0.96);
  }

  .icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    color: var(--tp-muted);
  }

  .icon svg {
    width: 18px;
    height: 18px;
  }

  .send {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin-inline-start: auto;
    padding: 0;
    border-radius: 16px;
    background: var(--tp-text);
    color: var(--tp-surface);
    transition:
      transform 160ms var(--tp-ease-out),
      background-color 160ms var(--tp-ease-out),
      color 160ms var(--tp-ease-out);
  }

  .send:disabled {
    background: color-mix(in oklab, var(--tp-text) 12%, var(--tp-surface));
    color: var(--tp-muted);
    cursor: default;
  }

  .icon:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .icon:focus-visible,
  .send:focus-visible,
  .suggest button:focus-visible,
  .files button:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 1px;
  }
</style>

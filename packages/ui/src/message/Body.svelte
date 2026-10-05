<script lang="ts">
  import type { MessageBody } from '@ticketping/core'
  import { renderBody } from '../lib/body.ts'
  import { sanitizeHtml } from '../lib/sanitize.ts'

  interface Props {
    body: MessageBody | null
  }

  const { body }: Props = $props()
  const rendered = $derived(renderBody(body))
  let sanitized = $state('')
  let htmlToken = 0

  $effect(() => {
    if (rendered.mode !== 'html') {
      sanitized = ''
      return
    }
    const token = ++htmlToken
    const fallback = rendered.fallback
    sanitized = fallback
    void sanitizeHtml(rendered.raw).then((html) => {
      if (token === htmlToken) sanitized = html
    })
  })
</script>

{#if rendered.mode === 'safe' && rendered.html}
  <div class="body">{@html rendered.html}</div>
{:else if rendered.mode === 'html' && sanitized}
  <div class="body">{@html sanitized}</div>
{/if}

<style>
  .body {
    overflow-wrap: anywhere;
  }

  .body :global(p) {
    margin: 0 0 0.4em;
  }

  .body :global(p:last-child) {
    margin-bottom: 0;
  }

  .body :global(a) {
    color: inherit;
    text-decoration: underline;
  }

  .body :global(pre),
  .body :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
  }

  .body :global(pre) {
    margin: 8px 0 0;
    padding: 8px;
    overflow: auto;
    border-radius: 8px;
    background: rgb(0 0 0 / 0.06);
  }

  .body :global(blockquote) {
    margin: 6px 0 0;
    padding-inline-start: 10px;
    border-inline-start: 3px solid var(--tp-border);
  }

  .body :global(ul),
  .body :global(ol) {
    margin: 6px 0 0;
    padding-inline-start: 1.2em;
  }
</style>

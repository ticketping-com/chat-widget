<script lang="ts">
  import type { Attachment, I18n } from '@ticketping/core'
  import { isFile, isGif, unknownLink } from '../lib/attachments.ts'
  import Gif from './Gif.svelte'

  interface Props {
    attachments: Attachment[]
    i18n: I18n
  }

  const { attachments, i18n }: Props = $props()
</script>

{#each attachments as attachment (attachment.id)}
  {#if isGif(attachment)}
    <Gif gif={attachment.gif} {i18n} />
  {:else if isFile(attachment)}
    {#if attachment.isImage && attachment.url}
      <a
        class="image"
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={i18n.t('attachments.open', { name: attachment.name })}
      >
        <img src={attachment.url} alt={attachment.name} />
      </a>
    {:else if attachment.url}
      <a
        class="file"
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.name}
      >
        <span class="name">{attachment.name}</span>
        <span class="meta">{i18n.formatFileSize(attachment.size)}</span>
      </a>
    {:else}
      <div class="file pending">
        <span class="name">{attachment.name}</span>
        <span class="meta">{i18n.formatFileSize(attachment.size)}</span>
      </div>
    {/if}
  {:else}
    {@const link = unknownLink(attachment, i18n)}
    {#if link}
      <a class="file" href={link.href} target="_blank" rel="noopener noreferrer">{link.name}</a>
    {/if}
  {/if}
{/each}

<style>
  .image {
    display: block;
    margin-top: 8px;
    overflow: hidden;
    border-radius: 10px;
  }

  .image img {
    display: block;
    max-width: 220px;
    max-height: 180px;
    object-fit: cover;
  }

  .file {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--tp-fill);
    color: inherit;
    text-decoration: none;
  }

  .file.pending {
    opacity: 0.7;
  }

  .name {
    font-weight: 600;
    word-break: break-word;
  }

  .meta {
    color: var(--tp-muted);
    font-size: 12px;
  }

  a:focus-visible {
    outline: 3px solid var(--tp-focus);
    outline-offset: 2px;
  }
</style>

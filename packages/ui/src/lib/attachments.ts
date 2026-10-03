import type { Attachment, FileAttachment, GifAttachment, I18n } from '@ticketping/core'

export function isFile(attachment: Attachment): attachment is FileAttachment {
  return attachment.kind === 'file'
}

export function isGif(attachment: Attachment): attachment is GifAttachment {
  return attachment.kind === 'gif'
}

/** Unknown kinds: a named link if they have a url, otherwise skip (protocol 3.5). */
export function unknownLink(
  attachment: Attachment,
  i18n: I18n
): { href: string; name: string } | null {
  if (isFile(attachment) || isGif(attachment)) return null
  const raw = attachment as { url?: unknown; name?: unknown }
  if (typeof raw.url !== 'string' || !raw.url) return null
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name : i18n.t('attachments.fallbackName')
  return { href: raw.url, name }
}

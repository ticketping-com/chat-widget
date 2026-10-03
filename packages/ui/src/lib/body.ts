import { escapeHtml, renderText } from './html.ts'
import { renderMarkdown } from './markdown.ts'
import type { MessageBody } from '@ticketping/core'

export type RenderedBody =
  { mode: 'html'; raw: string; fallback: string } | { mode: 'safe'; html: string }

/** Turn a message body into safe HTML. `html` format is sanitized asynchronously by the caller. */
export function renderBody(body: MessageBody | null): RenderedBody {
  if (!body) return { mode: 'safe', html: '' }
  if (body.format === 'text') return { mode: 'safe', html: renderText(body.content) }
  if (body.format === 'markdown') return { mode: 'safe', html: renderMarkdown(body.content) }
  if (body.format === 'html') {
    return {
      mode: 'html',
      raw: body.content,
      fallback: escapeHtml(body.fallbackText ?? '')
    }
  }
  return { mode: 'safe', html: escapeHtml(body.fallbackText ?? '') }
}

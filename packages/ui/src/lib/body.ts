import { escapeHtml, renderText } from './html.ts'
import { renderMarkdown } from './markdown.ts'
import type { Citation, MessageBody } from '@ticketping/core'

/** `body.citations` with an http(s) URL. A missing title falls back to the URL. */
export function citationLinks(body: MessageBody | null): Citation[] {
  if (!Array.isArray(body?.citations)) return []
  const out: Citation[] = []
  for (const item of body.citations as unknown[]) {
    const { title, url } = (item ?? {}) as Partial<Record<keyof Citation, unknown>>
    const href = typeof url === 'string' ? url.trim() : ''
    if (!/^https?:\/\/\S/i.test(href)) continue
    const label = typeof title === 'string' ? title.trim() : ''
    out.push({ title: label || href, url: href })
  }
  return out
}

export type RenderedBody =
  | { mode: 'html'; raw: string; fallback: string }
  | { mode: 'safe'; html: string }

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

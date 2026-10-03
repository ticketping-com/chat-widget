import { anchor, escapeHtml, safeHref } from './html.ts'

const PLACE = (i: number) => `%%TP${i}%%`

/** Safe markdown subset for agents and AI: emphasis, links, lists, code, quotes. */
export function renderMarkdown(source: string): string {
  const held: string[] = []
  const hold = (html: string) => {
    held.push(html)
    return PLACE(held.length - 1)
  }

  let text = source.replace(/\r\n/g, '\n')
  text = text.replace(/```([\w-]+)?\n([\s\S]*?)```/g, (_m, _lang: string, code: string) =>
    hold(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`)
  )
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) =>
    hold(`<code>${escapeHtml(code)}</code>`)
  )

  const blocks = text.split(/\n{2,}/)
  const html = blocks.map((block) => renderBlock(block, hold)).join('')
  return html.replace(/%%TP(\d+)%%/g, (_m, i: string) => held[Number(i)] ?? '')
}

function renderBlock(block: string, hold: (html: string) => string): string {
  const trimmed = block.trim()
  if (!trimmed) return ''
  if (/^%%TP\d+%%$/.test(trimmed)) return trimmed

  const quote = trimmed.split('\n').every((line) => /^>\s?/.test(line) || line.trim() === '')
  if (quote) {
    const inner = trimmed
      .split('\n')
      .map((line) => line.replace(/^>\s?/, ''))
      .join('\n')
    return `<blockquote>${renderBlock(inner, hold)}</blockquote>`
  }

  const lines = trimmed.split('\n')
  if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
    const items = lines
      .map((line) => `<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`)
      .join('')
    return `<ul>${items}</ul>`
  }
  if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    const items = lines
      .map((line) => `<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`)
      .join('')
    return `<ol>${items}</ol>`
  }

  return `<p>${inline(lines.join('\n'))}</p>`
}

function inline(value: string): string {
  let text = escapeHtml(value)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const safe = safeHref(href)
    return safe ? anchor(safe, label) : label
  })
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')
  text = text.replace(/(^|[^*])\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')
  text = text.replace(/(^|[^_])_(?!\s)(.+?)(?<!\s)_(?!_)/g, '$1<em>$2</em>')
  return text.replace(/\n/g, '<br>')
}

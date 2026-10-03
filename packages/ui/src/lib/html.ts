/** Escape text before interpolating it into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const SAFE_HREF = /^(https?:|mailto:)/i

/** Keep http(s) and mailto links; drop javascript: and protocol-relative URLs. */
export function safeHref(href: string): string | null {
  const trimmed = href.trim()
  if (!trimmed || trimmed.startsWith('//')) return null
  if (SAFE_HREF.test(trimmed)) return trimmed
  return null
}

export function anchor(href: string, label: string): string {
  const safe = safeHref(href)
  if (!safe) return label
  return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`
}

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi

/** Escape plain text and turn bare http(s) URLs into links (protocol 3.4 `text`). */
export function renderText(content: string): string {
  const escaped = escapeHtml(content)
  return escaped.replace(URL_RE, (url) => {
    const clean = url.replace(/[),.;!?]+$/, '')
    const punct = url.slice(clean.length)
    return `${anchor(clean, clean)}${punct}`
  })
}

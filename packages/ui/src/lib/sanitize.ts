import { escapeHtml } from './html.ts'

const CONFIG = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'strong',
    'i',
    'em',
    'u',
    's',
    'br',
    'p',
    'div',
    'span',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'hr',
    'img'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  ADD_ATTR: ['target']
}

let loading: Promise<typeof import('dompurify')> | null = null
let hooked = false

async function purify() {
  loading ??= import('dompurify')
  const mod = await loading
  const instance = mod.default
  if (!hooked) {
    hooked = true
    instance.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
      if (node.tagName === 'IMG') {
        const src = node.getAttribute('src') ?? ''
        if (!/^https?:\/\//i.test(src)) node.removeAttribute('src')
      }
    })
  }
  return instance
}

/** Protocol 3.4: sanitize email HTML again in the widget. Lazy-loads DOMPurify. */
export async function sanitizeHtml(html: string): Promise<string> {
  try {
    const instance = await purify()
    return instance.sanitize(html, { ...CONFIG, ADD_ATTR: ['target'] })
  } catch {
    return escapeHtml(html)
  }
}

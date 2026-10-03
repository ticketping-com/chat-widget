import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from './sanitize.ts'

describe('sanitizeHtml', () => {
  it('strips scripts and event handlers', async () => {
    const html = await sanitizeHtml(
      '<p>Hi<img src=x onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">x</a></p>'
    )
    expect(html).toContain('Hi')
    expect(html).not.toMatch(/script/i)
    expect(html).not.toMatch(/onerror/i)
    expect(html).not.toMatch(/javascript:/i)
  })

  it('keeps safe markup and forces safe links', async () => {
    const html = await sanitizeHtml('<p>See <a href="https://example.com">docs</a></p>')
    expect(html).toContain('<p>')
    expect(html).toContain('https://example.com')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })
})

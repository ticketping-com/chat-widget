import { describe, expect, it } from 'vitest'
import { renderBody } from './body.ts'
import { renderMarkdown } from './markdown.ts'
import { escapeHtml, renderText, safeHref } from './html.ts'

describe('renderText', () => {
  it('escapes HTML and linkifies http(s) URLs', () => {
    expect(renderText('See <b>docs</b> at https://example.com/a.')).toBe(
      'See &lt;b&gt;docs&lt;/b&gt; at <a href="https://example.com/a" target="_blank" rel="noopener noreferrer">https://example.com/a</a>.'
    )
  })

  it('does not turn javascript URLs into links', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(renderText('javascript:alert(1)')).toBe('javascript:alert(1)')
  })
})

describe('renderMarkdown', () => {
  it('renders the safe subset', () => {
    const html = renderMarkdown('Try **Settings** and `export`.\n\n- one\n- two')
    expect(html).toContain('<strong>Settings</strong>')
    expect(html).toContain('<code>export</code>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
  })

  it('drops unsafe link protocols', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).toContain('x')
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript')
  })

  it('escapes raw HTML', () => {
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).not.toContain('<img')
    expect(renderMarkdown('<img src=x onerror=alert(1)>')).toContain('&lt;img')
  })
})

describe('renderBody', () => {
  it('uses fallbackText for unknown formats', () => {
    expect(
      renderBody({ format: 'blocks', content: '<em>no</em>', fallbackText: 'Try again' })
    ).toEqual({
      mode: 'safe',
      html: escapeHtml('Try again')
    })
  })

  it('defers html format for DOMPurify', () => {
    expect(renderBody({ format: 'html', content: '<p>Hi</p>', fallbackText: 'Hi' })).toEqual({
      mode: 'html',
      raw: '<p>Hi</p>',
      fallback: 'Hi'
    })
  })
})

// Response headers for widget.ticketping.com. Kept free of Workers types so it can be
// tested with plain `node --test`.

export const LOADER_MAX_AGE = 300
const VERSIONED = /^\/v2\/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\//
const LOADER = /^\/v2\/loader\.js$/

export function isServable(path: string): boolean {
  return LOADER.test(path) || (VERSIONED.test(path) && !path.includes('..'))
}

export function headersFor(path: string, contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': LOADER.test(path)
      ? `public, max-age=${LOADER_MAX_AGE}, stale-while-revalidate=86400`
      : 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Timing-Allow-Origin': '*'
  }
}

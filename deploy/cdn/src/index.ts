import { headersFor, isServable } from './headers.ts'

interface Env {
  BUNDLES: R2Bucket
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    const url = new URL(request.url)
    if (!isServable(url.pathname)) return new Response('Not found', { status: 404 })

    // The bucket lives in one region; the edge cache keeps repeat loads local.
    const cache = caches.default
    const cacheKey = new Request(url.origin + url.pathname)
    const plain = !request.headers.has('range')
    if (plain) {
      const hit = await cache.match(cacheKey)
      if (hit) return conditional(request, hit)
    }

    const object = await env.BUNDLES.get(url.pathname.slice(1), {
      onlyIf: request.headers,
      range: request.headers
    })
    if (!object) return new Response('Not found', { status: 404 })

    const headers = new Headers(
      headersFor(url.pathname, object.httpMetadata?.contentType ?? 'application/octet-stream')
    )
    headers.set('ETag', object.httpEtag)
    if (!('body' in object)) return new Response(null, { status: 304, headers })

    const response = new Response(object.body, { headers })
    if (plain) ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return request.method === 'HEAD' ? new Response(null, { headers }) : response
  }
} satisfies ExportedHandler<Env>

function conditional(request: Request, cached: Response): Response {
  const etag = cached.headers.get('ETag')
  if (etag && request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: cached.headers })
  }
  return request.method === 'HEAD' ? new Response(null, { headers: cached.headers }) : cached
}

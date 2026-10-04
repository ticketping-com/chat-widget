import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { playgroundMock } from './mock-api.ts'

const page = (name: string) => resolve(import.meta.dirname, name)
const ORIGIN = 'http://127.0.0.1:5180'

/** `GET /v2/loader.js` for the dashboard preview iframe (opaque origin, so CORS is required). */
function dashboardPreviewLoader(): Plugin {
  const loader = `document.head.appendChild(Object.assign(document.createElement('script'),{type:'module',src:${JSON.stringify(`${ORIGIN}/preview-widget.ts`)}}))`
  return {
    name: 'dashboard-preview-loader',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/v2/loader.js') return next()
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Cache-Control', 'no-store')
        res.end(loader)
      })
    }
  }
}

export default defineConfig({
  plugins: [
    svelte({ configFile: '../../packages/ui/svelte.config.js' }),
    playgroundMock(),
    dashboardPreviewLoader()
  ],
  define: { __VERSION__: JSON.stringify('dev') },
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
    cors: { origin: '*' },
    headers: { 'Access-Control-Allow-Origin': '*' }
  },
  build: {
    rollupOptions: {
      input: { index: page('index.html'), hostile: page('hostile-css.html') }
    }
  }
})

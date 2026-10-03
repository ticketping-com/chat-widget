import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { playgroundMock } from './mock-api.ts'

const page = (name: string) => resolve(import.meta.dirname, name)

export default defineConfig({
  plugins: [svelte({ configFile: '../../packages/ui/svelte.config.js' }), playgroundMock()],
  define: { __VERSION__: JSON.stringify('dev') },
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  build: {
    rollupOptions: {
      input: { index: page('index.html'), hostile: page('hostile-css.html') }
    }
  }
})

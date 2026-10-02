import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const page = (name: string) => resolve(import.meta.dirname, name)

export default defineConfig({
  plugins: [svelte({ configFile: '../../packages/ui/svelte.config.js' })],
  define: { __VERSION__: JSON.stringify('dev') },
  server: { port: 5180 },
  build: {
    rollupOptions: {
      input: { index: page('index.html'), hostile: page('hostile-css.html') }
    }
  }
})

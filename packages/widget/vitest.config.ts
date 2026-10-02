import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [svelte({ configFile: '../ui/svelte.config.js' })],
  resolve: { conditions: ['browser'] },
  define: { __VERSION__: JSON.stringify('0.0.0-test') },
  test: {
    name: 'widget',
    environment: 'jsdom'
  }
})

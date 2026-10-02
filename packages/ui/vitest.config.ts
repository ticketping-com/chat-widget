import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [svelte()],
  resolve: { conditions: ['browser'] },
  test: {
    name: 'ui',
    environment: 'jsdom'
  }
})

import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync } from 'node:fs'
import { defineConfig, type UserConfig } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

const shared: UserConfig = {
  plugins: [svelte({ configFile: '../ui/svelte.config.js' })],
  define: { __VERSION__: JSON.stringify(version) },
  build: { emptyOutDir: false, target: 'es2022', minify: true, sourcemap: true }
}

// Three targets, mirroring where each file is served from:
//   loader  -> widget.ticketping.com/v2/loader.js          (short cache, tiny)
//   cdn     -> widget.ticketping.com/v2/<version>/widget.js (immutable)
//   npm     -> dist/npm, published as @ticketping/chat-widget
const targets: Record<string, UserConfig['build']> = {
  loader: {
    outDir: 'dist/cdn',
    sourcemap: false,
    lib: {
      entry: 'src/loader.ts',
      formats: ['iife'],
      name: 'TicketpingLoader',
      fileName: () => 'loader.js'
    }
  },
  cdn: {
    outDir: `dist/cdn/${version}`,
    lib: {
      entry: 'src/cdn.ts',
      formats: ['iife'],
      name: 'TicketpingWidget',
      fileName: () => 'widget.js'
    }
  },
  npm: {
    outDir: 'dist/npm',
    minify: false,
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' }
  }
}

export default defineConfig(({ mode }) => {
  const build = targets[mode]
  if (!build)
    throw new Error(`Unknown build mode "${mode}". Use one of: ${Object.keys(targets).join(', ')}`)
  return { ...shared, build: { ...shared.build, ...build } }
})

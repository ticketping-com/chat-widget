import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

// Bundles public types into one file so consumers never see the private workspace packages.
export default defineConfig({
  input: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
    svelte: 'src/svelte.ts'
  },
  output: { dir: 'dist/npm' },
  external: ['react', 'vue', 'svelte', /^svelte\//, /\.svelte$/],
  plugins: [dts({ emitDtsOnly: true, generator: 'oxc' })]
})

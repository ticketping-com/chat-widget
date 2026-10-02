import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

// Bundles public types into one file so consumers never see the private workspace packages.
export default defineConfig({
  input: { index: 'src/index.ts' },
  output: { dir: 'dist/npm' },
  plugins: [dts({ emitDtsOnly: true, generator: 'oxc' })]
})

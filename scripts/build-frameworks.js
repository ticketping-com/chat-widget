#!/usr/bin/env node

import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const rootDir = resolve(__dirname, '..')
const srcDir = resolve(rootDir, 'src/frameworks')
const distDir = resolve(rootDir, 'dist/frameworks')

// Ensure dist directories exist
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Copy framework files
function copyFiles() {
  console.log('📦 Building framework components...')

  // Create directories
  ensureDir(resolve(distDir, 'svelte'))
  ensureDir(resolve(distDir, 'svelte4'))
  ensureDir(resolve(distDir, 'react'))

  // Copy Svelte 5 files
  copyFileSync(
    resolve(srcDir, 'svelte/TicketpingChat5.svelte'),
    resolve(distDir, 'svelte/TicketpingChat5.svelte')
  )
  copyFileSync(
    resolve(srcDir, 'svelte/index.js'),
    resolve(distDir, 'svelte/index.js')
  )
  copyFileSync(
    resolve(srcDir, 'svelte/index.d.ts'),
    resolve(distDir, 'svelte/index.d.ts')
  )

  // Copy Svelte 4 files
  copyFileSync(
    resolve(srcDir, 'svelte4/TicketpingChat4.svelte'),
    resolve(distDir, 'svelte4/TicketpingChat4.svelte')
  )
  copyFileSync(
    resolve(srcDir, 'svelte4/index.js'),
    resolve(distDir, 'svelte4/index.js')
  )
    copyFileSync(
    resolve(srcDir, 'svelte4/index.d.ts'),
    resolve(distDir, 'svelte4/index.d.ts')
  )

  // Copy React files
  copyFileSync(
    resolve(srcDir, 'react/TicketpingChat.js'),
    resolve(distDir, 'react/TicketpingChat.js')
  )
  copyFileSync(
    resolve(srcDir, 'react/index.js'),
    resolve(distDir, 'react/index.js')
  )
  copyFileSync(
    resolve(srcDir, 'react/index.d.ts'),
    resolve(distDir, 'react/index.d.ts')
  )

  console.log('✅ Framework components built successfully!')
}

copyFiles()

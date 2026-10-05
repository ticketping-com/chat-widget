/* oxlint-disable no-console -- CLI output */
// Uploads packages/widget/dist/cdn to the R2 bucket behind widget.ticketping.com.
// Versioned files are immutable: if <version>/widget.js already exists, the version is
// skipped rather than overwritten. Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
//
//   node deploy/cdn/upload.ts            # upload
//   node deploy/cdn/upload.ts --dry-run  # print what would be uploaded

import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const BUCKET = 'ticketping-widget'
const DIST = join(import.meta.dirname, '../../packages/widget/dist/cdn')
const WRANGLER = ['--yes', 'wrangler@4']
const dryRun = process.argv.includes('--dry-run')

const version: string = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../packages/widget/package.json'), 'utf8')
).version

const TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

function exists(key: string): boolean {
  const result = spawnSync(
    'npx',
    [...WRANGLER, 'r2', 'object', 'get', `${BUCKET}/${key}`, '--remote', '--pipe'],
    {
      stdio: ['ignore', 'ignore', 'ignore']
    }
  )
  return result.status === 0
}

function put(key: string, file: string): void {
  const ext = file.slice(file.lastIndexOf('.'))
  const args = ['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--remote']
  args.push('--content-type', TYPES[ext] ?? 'application/octet-stream')
  if (dryRun) {
    console.log(`would upload ${key}`)
    return
  }
  execFileSync('npx', [...WRANGLER, ...args], { stdio: 'inherit' })
}

const versionDir = join(DIST, version)
const versioned = files(versionDir).filter((f) => !f.endsWith('.map'))

// Subresource Integrity hashes for pinned installs.
const integrity = Object.fromEntries(
  versioned.map((f) => [
    relative(versionDir, f),
    `sha384-${createHash('sha384').update(readFileSync(f)).digest('base64')}`
  ])
)
const manifestPath = join(versionDir, 'manifest.json')
writeFileSync(manifestPath, `${JSON.stringify({ version, integrity }, null, 2)}\n`)

if (!dryRun && exists(`v2/${version}/widget.js`)) {
  console.log(`v2/${version} is already published; versioned files are immutable, skipping.`)
} else {
  for (const file of [...versioned, manifestPath])
    put(`v2/${version}/${relative(versionDir, file)}`, file)
}

// Prereleases never move the loader that production sites use.
if (version.includes('-')) {
  console.log(`Prerelease ${version}: loader not updated. Pin with /v2/${version}/widget.js.`)
} else {
  put('v2/loader.js', join(DIST, 'loader.js'))
}

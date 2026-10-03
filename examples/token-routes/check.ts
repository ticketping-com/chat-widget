// Checks every token route in this folder against spec/token-test-vectors.json.
// Each example signs a token for a fixed test user with the vectors' current secret; the
// reference verifier (spec/reference/verify-token.ts) must accept it with the expected claims.
// Languages that aren't installed are skipped with a message. Run: npm run examples:check

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { verifyToken, type Secret } from '../../spec/reference/verify-token.ts'
import type { TestUser } from './harness/stubs.ts'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const vectors = JSON.parse(readFileSync(here('../../spec/token-test-vectors.json'), 'utf8')) as {
  now: number
  secrets: [Secret, ...Secret[]]
}
const NOW = vectors.now
const SECRET = vectors.secrets[0].secret
const USER: TestUser = { id: 123, email: 'ada@acme.com', name: 'Ada Lovelace' }
const EXPECTED = { sub: '123', email: USER.email, name: USER.name }
const REFUSED = [401, 403]

type Outcome =
  | { status: 'pass'; clock: 'fixed' | 'wall' }
  | { status: 'fail'; reason: string }
  | { status: 'skip'; reason: string }

const results: { example: string; outcome: Outcome }[] = []
const record = (example: string, outcome: Outcome) => results.push({ example, outcome })

/** Verifies a token and its lifetime: `exp` must be exactly 5 minutes after the clock used. */
function judge(token: string, clock: 'fixed' | 'wall', now: number): Outcome {
  const result = verifyToken(token, { secrets: vectors.secrets, now, seen: new Set() })
  if (!result.valid) {
    return { status: 'fail', reason: `${result.error}${result.claim ? ` (${result.claim})` : ''}` }
  }
  const got = JSON.stringify(result.claims)
  if (got !== JSON.stringify(EXPECTED)) {
    return { status: 'fail', reason: `claims ${got}, expected ${JSON.stringify(EXPECTED)}` }
  }
  const [, segment = ''] = token.split('.')
  const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  const lifetime = payload.exp - now
  const ok = clock === 'fixed' ? lifetime === 300 : lifetime >= 299 && lifetime <= 301
  if (!ok) return { status: 'fail', reason: `exp is ${lifetime}s after now, expected 300s` }
  return { status: 'pass', clock }
}

const has = (command: string, ...args: string[]) =>
  spawnSync(command, args.length > 0 ? args : ['--version'], { stdio: 'ignore' }).status === 0

const childEnv = { ...process.env, TICKETPING_IDENTITY_SECRET: SECRET, TP_NOW: String(NOW) }

/** Runs a harness that prints one JSON line per example. */
function runHarness(command: string, args: string[], cwd = here('.')) {
  const run = spawnSync(command, args, { cwd, env: childEnv, encoding: 'utf8' })
  const lines = run.stdout
    .split('\n')
    .filter((line) => line.startsWith('{'))
    .map(
      (line) =>
        JSON.parse(line) as {
          example: string
          token?: string
          status?: number
          anonymousStatus?: number
          skip?: string
          error?: string
        }
    )
  if (lines.length === 0) {
    const output = `${run.stderr}${run.stdout}`.trim().split('\n').slice(-5).join('\n')
    return { lines, failure: output || `exit code ${run.status}` }
  }
  return { lines, failure: undefined }
}

function recordHarnessLines(
  lines: ReturnType<typeof runHarness>['lines'],
  clock: 'fixed' | 'wall'
) {
  for (const line of lines) {
    if (line.skip) record(line.example, { status: 'skip', reason: line.skip })
    else if (line.error) record(line.example, { status: 'fail', reason: line.error })
    else if (line.status !== 200 || !line.token) {
      record(line.example, { status: 'fail', reason: `HTTP ${line.status}` })
    } else if (line.anonymousStatus !== undefined && !REFUSED.includes(line.anonymousStatus)) {
      record(line.example, {
        status: 'fail',
        reason: `signed-out request got HTTP ${line.anonymousStatus}, expected 401 or 403`
      })
    } else {
      const now = clock === 'fixed' ? NOW : Math.floor(Date.now() / 1000)
      record(line.example, judge(line.token, clock, now))
    }
  }
}

// --- JavaScript and TypeScript, in this process -------------------------------------------

async function checkJavaScript() {
  if (!existsSync(here('node_modules/jose'))) {
    for (const name of [
      'node',
      'nextjs',
      'sveltekit',
      'nuxt',
      'tanstack-start',
      'react-router',
      'astro'
    ]) {
      record(name, { status: 'skip', reason: 'run `npm ci` in examples/token-routes first' })
    }
    return
  }

  const stubs = pathToFileURL(here('harness/stubs.ts')).href
  const stubbed = [
    '@/auth',
    '@/lib/auth',
    '~/auth.server',
    '$env/dynamic/private',
    '@tanstack/react-router'
  ]
  registerHooks({
    resolve: (specifier, context, next) =>
      stubbed.includes(specifier) ? { url: stubs, shortCircuit: true } : next(specifier, context)
  })

  process.env.TICKETPING_IDENTITY_SECRET = SECRET
  const g = globalThis as Record<string, unknown>
  const signedIn = (user: TestUser | null) => (g.__ticketpingUser = user)

  const RealDate = Date
  class FixedDate extends RealDate {
    constructor(...args: [] | [string | number | Date]) {
      if (args.length === 0) super(NOW * 1000)
      else super(args[0])
    }
    static override now() {
      return NOW * 1000
    }
  }

  // Nuxt auto-imports (nuxt-auth-utils and h3)
  g.defineEventHandler = (handler: unknown) => handler
  g.setResponseHeader = () => {}
  g.requireUserSession = async () => {
    const user = g.__ticketpingUser
    if (!user) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    return { user }
  }

  type Handler = () => Promise<{ status: number; body: string }>
  type Route = (event?: unknown, res?: unknown) => Promise<Response | string | undefined>
  type Module = Record<string, unknown>
  const exported = (value: unknown, name: string): Route => {
    if (typeof value !== 'function') throw new Error(`${name} is not exported`)
    return value as Route
  }
  const fromResponse = async (response: Response | string | undefined) =>
    typeof response === 'string'
      ? { status: 200, body: response }
      : { status: response?.status ?? 500, body: (await response?.text()) ?? '' }

  const request = () => new Request('http://localhost/api/ticketping-token', { method: 'POST' })
  const locals = () => ({ user: g.__ticketpingUser ?? undefined })

  const examples: Record<string, { file: string; call: (mod: Module) => Handler }> = {
    node: {
      file: 'node/ticketping-token.js',
      call: (mod) => async () => {
        let status = 200
        let body = ''
        const res = {
          sendStatus(code: number) {
            status = code
            return res
          },
          type: () => res,
          send(value: string) {
            body = value
            return res
          }
        }
        await exported(mod.ticketpingToken, 'ticketpingToken')(
          { user: g.__ticketpingUser ?? undefined },
          res
        )
        return { status, body }
      }
    },
    nextjs: {
      file: 'nextjs/app/api/ticketping-token/route.ts',
      call: (mod) => async () => fromResponse(await exported(mod.POST, 'POST')())
    },
    sveltekit: {
      file: 'sveltekit/src/routes/api/ticketping-token/+server.ts',
      call: (mod) => async () =>
        fromResponse(await exported(mod.POST, 'POST')({ locals: locals() }))
    },
    nuxt: {
      file: 'nuxt/server/api/ticketping-token.post.ts',
      call: (mod) => async () => {
        try {
          return await fromResponse(await exported(mod.default, 'default')({}))
        } catch (error) {
          return { status: (error as { statusCode?: number }).statusCode ?? 500, body: '' }
        }
      }
    },
    'tanstack-start': {
      file: 'tanstack-start/src/routes/api/ticketping-token.ts',
      call: (mod) => async () =>
        fromResponse(
          await exported(
            (mod.Route as { server?: { handlers?: { POST?: unknown } } } | undefined)?.server
              ?.handlers?.POST,
            'Route.server.handlers.POST'
          )({ request: request() })
        )
    },
    'react-router': {
      file: 'react-router/app/routes/api.ticketping-token.ts',
      call: (mod) => async () =>
        fromResponse(await exported(mod.action, 'action')({ request: request() }))
    },
    astro: {
      file: 'astro/src/pages/api/ticketping-token.ts',
      call: (mod) => async () =>
        fromResponse(await exported(mod.POST, 'POST')({ locals: locals() }))
    }
  }

  globalThis.Date = FixedDate as DateConstructor
  try {
    for (const [name, { file, call }] of Object.entries(examples)) {
      try {
        const run = call((await import(pathToFileURL(here(file)).href)) as Module)
        signedIn(null)
        const anonymous = await run()
        if (!REFUSED.includes(anonymous.status)) {
          record(name, {
            status: 'fail',
            reason: `signed-out request got HTTP ${anonymous.status}, expected 401 or 403`
          })
          continue
        }
        signedIn(USER)
        const { status, body } = await run()
        record(
          name,
          status === 200 ? judge(body, 'fixed', NOW) : { status: 'fail', reason: `HTTP ${status}` }
        )
      } catch (error) {
        record(name, { status: 'fail', reason: String(error) })
      }
    }
  } finally {
    globalThis.Date = RealDate
  }
}

// --- Other languages, in child processes ------------------------------------------------

function checkPython() {
  const python = process.env.PYTHON ?? 'python3'
  const names = ['django', 'django-drf', 'fastapi', 'flask']
  if (!has(python)) {
    for (const name of names) record(name, { status: 'skip', reason: `${python} not found` })
    return
  }
  for (const name of names) {
    const { lines, failure } = runHarness(python, ['harness/check_python.py', name])
    if (failure) record(name, { status: 'fail', reason: failure })
    recordHarnessLines(lines, 'fixed')
  }
}

function checkRuby() {
  if (!has('ruby')) return record('rails', { status: 'skip', reason: 'ruby not found' })
  const { lines, failure } = runHarness('ruby', ['harness/check_rails.rb'])
  if (failure) return record('rails', { status: 'fail', reason: failure })
  recordHarnessLines(lines, 'fixed')
}

function checkGo() {
  if (!has('go', 'version')) return record('go', { status: 'skip', reason: 'go not found' })
  const run = spawnSync(
    'go',
    ['test', '-mod=mod', '-count=1', '-run', 'TestPrintToken', '-v', '.'],
    {
      cwd: here('go'),
      env: childEnv,
      encoding: 'utf8'
    }
  )
  const token = /^TOKEN=(.+)$/m.exec(run.stdout)?.[1]
  if (!token) {
    const output = `${run.stderr}${run.stdout}`.trim().split('\n').slice(-5).join('\n')
    return record('go', { status: 'fail', reason: output || `exit code ${run.status}` })
  }
  record('go', judge(token, 'wall', Math.floor(Date.now() / 1000)))
}

function checkPhp() {
  if (!has('php')) return record('php', { status: 'skip', reason: 'php not found' })
  if (!existsSync(here('php/vendor/autoload.php'))) {
    if (!has('composer')) return record('php', { status: 'skip', reason: 'composer not found' })
    const install = spawnSync('composer', ['install', '--quiet'], {
      cwd: here('php'),
      stdio: 'inherit'
    })
    if (install.status !== 0)
      return record('php', { status: 'fail', reason: 'composer install failed' })
  }
  const { lines, failure } = runHarness('php', ['harness/check_laravel.php'])
  if (failure) return record('php', { status: 'fail', reason: failure })
  recordHarnessLines(lines, 'wall')
}

await checkJavaScript()
checkPython()
checkRuby()
checkGo()
checkPhp()

const width = Math.max(...results.map((r) => r.example.length))
for (const { example, outcome } of results) {
  const detail =
    outcome.status === 'pass'
      ? outcome.clock === 'fixed'
        ? 'valid, fixed clock'
        : 'valid, wall clock'
      : outcome.reason
  process.stdout.write(
    `${outcome.status.toUpperCase().padEnd(4)}  ${example.padEnd(width)}  ${detail}\n`
  )
}

const failed = results.filter((r) => r.outcome.status === 'fail').length
const skipped = results.filter((r) => r.outcome.status === 'skip').length
process.stdout.write(
  `\n${results.length - failed - skipped} passed, ${failed} failed, ${skipped} skipped\n`
)
process.exitCode = failed > 0 ? 1 : 0

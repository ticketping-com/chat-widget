import { PK, createFakeEnv, flush, installBackend, type FakeEnv } from '@ticketping/core/testing'
import { HOST_TAG } from '@ticketping/ui'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createClient, type TicketpingClient } from '../client.ts'
import Harness from './fixtures/Harness.svelte'

let env: FakeEnv
let client: TicketpingClient
let app: Record<string, unknown> | undefined

async function settle() {
  await flush()
  await flush()
  flushSync()
}

const state = () => document.querySelector('[data-testid="state"]')?.textContent
/** The new-conversation composer inside the widget's shadow root. */
const composer = () =>
  document.querySelector(HOST_TAG)?.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea')

beforeEach(() => {
  env = createFakeEnv()
  installBackend(env)
  client = createClient({ version: 'test', integration: 'svelte', platform: env.platform })
})

afterEach(() => {
  if (app) unmount(app)
  app = undefined
  document.body.innerHTML = ''
})

function render() {
  app = mount(Harness, {
    target: document.body,
    props: { client, publishableKey: PK, apiUrl: 'http://api.test' }
  })
  flushSync()
}

describe('<Ticketping client>', () => {
  it('initialises the instance it is given, so the host app can drive it', async () => {
    render()
    await settle()
    expect(document.querySelector(HOST_TAG)).not.toBeNull()
    expect(env.requests[0]?.headers['X-Ticketping-Client']).toBe('widget/test (svelte)')

    client.open()
    flushSync()
    expect(client.isOpen()).toBe(true)
  })

  it('keeps an open-with-message call made before the widget has booted', async () => {
    render()
    client.showNewMessage('About order 42')
    await settle()

    expect(client.isOpen()).toBe(true)
    expect(composer()?.value).toBe('About order 42')
  })

  it('destroys the instance on unmount; it can be initialised again', async () => {
    render()
    await settle()
    if (app) unmount(app)
    app = undefined
    flushSync()
    expect(document.querySelector(HOST_TAG)).toBeNull()

    render()
    await settle()
    expect(document.querySelector(HOST_TAG)).not.toBeNull()
  })
})

describe('useTicketping()', () => {
  it('gives children reactive state and the actions', async () => {
    render()
    await settle()
    expect(state()).toBe('closed 0')

    document.querySelector<HTMLButtonElement>('button')?.click()
    await settle()
    expect(state()).toBe('open 0')
    expect(composer()?.value).toBe('Order 42')

    client.close()
    flushSync()
    expect(state()).toBe('closed 0')
  })
})

import { PK, createFakeEnv, flush, installBackend, type FakeEnv } from '@ticketping/core/testing'
import { HOST_TAG } from '@ticketping/ui'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type TicketpingClient } from './client.ts'

let env: FakeEnv
let client: TicketpingClient

async function settle() {
  await flush()
  await flush()
  flushSync()
}

const host = () => document.querySelector(HOST_TAG)

beforeEach(() => {
  env = createFakeEnv()
  installBackend(env)
  client = createClient({ version: 'test', integration: 'script', platform: env.platform })
})

afterEach(() => {
  client.destroy()
  vi.restoreAllMocks()
})

describe('createClient', () => {
  it('mounts once booted and toggles open state with events', async () => {
    const onOpen = vi.fn()
    const onClose = vi.fn()
    const onReady = vi.fn()
    client.on('open', onOpen)
    client.on('close', onClose)
    client.on('ready', onReady)

    client.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    expect(host()).toBeNull()
    await settle()
    expect(host()).not.toBeNull()
    expect(onReady).toHaveBeenCalledOnce()
    expect(env.requests[0]?.headers['X-Ticketping-Client']).toBe('widget/test (script)')

    client.open()
    client.open()
    expect(client.isOpen()).toBe(true)
    expect(onOpen).toHaveBeenCalledOnce()

    client.toggle()
    expect(client.isOpen()).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('rejects a malformed key with an error event and renders nothing', async () => {
    const onError = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    client.on('error', onError)
    client.init({ publishableKey: 'tp_abc' })
    await settle()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_publishable_key' })
    )
    expect(host()).toBeNull()
    expect(env.requests).toHaveLength(0)
  })

  it('renders nothing until consent is granted, and removes itself when it is denied', async () => {
    client.init({ publishableKey: PK, apiUrl: 'http://api.test', consent: 'pending' })
    await settle()
    expect(host()).toBeNull()
    expect(env.requests).toHaveLength(0)

    client.consent('granted')
    await settle()
    expect(host()).not.toBeNull()

    client.consent('denied')
    await settle()
    expect(host()).toBeNull()
    expect(env.storage.length).toBe(0)
  })

  it('calls late ready subscribers once', async () => {
    client.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await settle()
    const onReady = vi.fn()
    client.on('ready', onReady)
    await Promise.resolve()
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('ignores open() before init', () => {
    client.open()
    expect(client.isOpen()).toBe(false)
  })

  it('opens spaces, conversations and a prefilled new message', async () => {
    client.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await settle()
    client.showSpace('messages')
    expect(client.controller.getState().view).toEqual({ name: 'messages' })
    expect(client.isOpen()).toBe(true)
    client.showConversation('cs_1')
    expect(client.controller.getState().view).toEqual({ name: 'thread', conversationId: 'cs_1' })
    client.showNewMessage('I need help with billing')
    expect(client.controller.getState().prefill).toBe('I need help with billing')
    client.showSpace('home')
    expect(client.controller.getState().view).toEqual({ name: 'home' })
  })

  it('previews without network or storage', async () => {
    client.preview({ config: { team: { name: 'Preview Co' } } })
    await settle()
    expect(host()).not.toBeNull()
    expect(client.isOpen()).toBe(true)
    expect(env.requests).toHaveLength(0)
    expect(env.storage.length).toBe(0)
  })

  it('can be destroyed and initialised again', async () => {
    client.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await settle()
    client.destroy()
    expect(host()).toBeNull()
    const onReady = vi.fn()
    client.on('ready', onReady)
    client.init({ publishableKey: PK, apiUrl: 'http://api.test' })
    await settle()
    expect(host()).not.toBeNull()
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('keeps the controller off the enumerable API', () => {
    expect(Object.keys(client)).not.toContain('controller')
    expect(client.controller).toBeDefined()
  })
})

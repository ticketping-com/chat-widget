import { HOST_TAG } from '@ticketping/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TicketpingApi } from './api.ts'
import { createClient } from './client.ts'

const KEY = 'pk_0123456789abcdefghijklmn'
let client: TicketpingApi

afterEach(() => client?.destroy())

describe('createClient', () => {
  it('mounts on init and toggles open state with events', () => {
    client = createClient('test')
    const onOpen = vi.fn()
    const onClose = vi.fn()
    client.on('open', onOpen)
    client.on('close', onClose)

    client.init({ publishableKey: KEY })
    expect(document.querySelector(HOST_TAG)).not.toBeNull()

    client.open()
    client.open()
    expect(client.isOpen()).toBe(true)
    expect(onOpen).toHaveBeenCalledOnce()

    client.toggle()
    expect(client.isOpen()).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('rejects a malformed key with an error event and renders nothing', () => {
    client = createClient('test')
    const onError = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    client.on('error', onError)

    client.init({ publishableKey: 'tp_abc' })

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_publishable_key' })
    )
    expect(document.querySelector(HOST_TAG)).toBeNull()
    consoleSpy.mockRestore()
  })

  it('renders nothing until consent is granted', () => {
    client = createClient('test')
    client.init({ publishableKey: KEY, consent: 'pending' })
    expect(document.querySelector(HOST_TAG)).toBeNull()

    client.consent('granted')
    expect(document.querySelector(HOST_TAG)).not.toBeNull()

    client.consent('denied')
    expect(document.querySelector(HOST_TAG)).toBeNull()
  })

  it('calls late ready subscribers once', async () => {
    client = createClient('test')
    client.init({ publishableKey: KEY })
    const onReady = vi.fn()

    client.on('ready', onReady)
    await Promise.resolve()

    expect(onReady).toHaveBeenCalledOnce()
  })

  it('ignores open() before init', () => {
    client = createClient('test')
    client.open()
    expect(client.isOpen()).toBe(false)
  })
})

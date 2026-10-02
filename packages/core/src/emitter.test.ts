import { describe, expect, it, vi } from 'vitest'
import { createEmitter } from './emitter.ts'

interface Events {
  ping: { n: number }
  done: undefined
}

describe('createEmitter', () => {
  it('delivers payloads to subscribers and stops after unsubscribe', () => {
    const emitter = createEmitter<Events>()
    const handler = vi.fn()
    const off = emitter.on('ping', handler)

    emitter.emit('ping', { n: 1 })
    off()
    emitter.emit('ping', { n: 2 })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ n: 1 })
  })

  it('keeps calling other handlers when one throws', () => {
    const emitter = createEmitter<Events>()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const second = vi.fn()
    emitter.on('done', () => {
      throw new Error('host bug')
    })
    emitter.on('done', second)

    emitter.emit('done', undefined)

    expect(second).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })
})

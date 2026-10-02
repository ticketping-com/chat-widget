import { describe, expect, it, vi } from 'vitest'
import { createStore } from './store.ts'

describe('createStore', () => {
  it('notifies on subscribe and on change', () => {
    const store = createStore({ open: false, unread: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.set({ open: true })
    store.set((s) => ({ unread: s.unread + 1 }))

    expect(listener).toHaveBeenCalledTimes(3)
    expect(store.get()).toEqual({ open: true, unread: 1 })
  })

  it('skips notifications when nothing changed', () => {
    const store = createStore({ open: false })
    const listener = vi.fn()
    store.subscribe(listener)

    store.set({ open: false })

    expect(listener).toHaveBeenCalledTimes(1)
  })
})

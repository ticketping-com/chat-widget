export interface Store<T extends object> {
  get(): T
  set(update: Partial<T> | ((state: T) => Partial<T>)): void
  subscribe(listener: (state: T) => void): () => void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<(state: T) => void>()

  return {
    get: () => state,
    set(update) {
      const patch = typeof update === 'function' ? update(state) : update
      const changed = Object.keys(patch).some(
        (key) => !Object.is(patch[key as keyof T], state[key as keyof T])
      )
      if (!changed) return
      state = { ...state, ...patch }
      for (const listener of [...listeners]) listener(state)
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    }
  }
}

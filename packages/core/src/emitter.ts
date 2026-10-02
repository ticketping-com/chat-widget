type Handler<T> = (payload: T) => void

export interface Emitter<Events extends object> {
  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void
  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void
  emit<K extends keyof Events>(event: K, payload: Events[K]): void
  clear(): void
}

export function createEmitter<Events extends object>(): Emitter<Events> {
  const handlers = new Map<keyof Events, Set<Handler<never>>>()

  return {
    on(event, handler) {
      let set = handlers.get(event)
      if (!set) {
        set = new Set()
        handlers.set(event, set)
      }
      set.add(handler as Handler<never>)
      return () => this.off(event, handler)
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler as Handler<never>)
    },
    emit(event, payload) {
      const set = handlers.get(event)
      if (!set) return
      // A throwing host handler must not break the widget or other handlers.
      for (const handler of [...set]) {
        try {
          ;(handler as Handler<typeof payload>)(payload)
        } catch (err) {
          console.error('[Ticketping] event handler failed', err)
        }
      }
    },
    clear() {
      handlers.clear()
    }
  }
}

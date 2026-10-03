import type { TicketpingApi, TicketpingGlobal, TicketpingMethod } from './api.ts'

/** What the loader (or a hand-written stub) leaves on `window` before the bundle arrives. */
export interface QueueStub {
  (...args: unknown[]): void
  q?: ArrayLike<unknown>[]
}

export function createGlobal(api: TicketpingApi): TicketpingGlobal {
  const call = (method: string, ...args: unknown[]) => {
    const fn = api[method as TicketpingMethod]
    if (typeof fn !== 'function') {
      console.error(`[Ticketping] Unknown method "${method}".`)
      return
    }
    ;(fn as (...a: unknown[]) => unknown)(...args)
  }
  return Object.assign(call, api) as TicketpingGlobal
}

// Event subscriptions replay first so handlers see `ready` and early errors from init.
// Then init, preview and consent in their queued order (a `consent('pending')` queued before
// init must stop the boot), then everything else in the order the page queued it.
const PRIORITY: Record<string, number> = { on: 0, off: 0, init: 1, preview: 1, consent: 1 }
const priority = (method: unknown) => PRIORITY[method as string] ?? 2

export function replayQueue(global: TicketpingGlobal, stub: QueueStub | undefined): void {
  const calls = Array.from(stub?.q ?? [], (args) => Array.from(args) as [string, ...unknown[]])
  calls.sort((a, b) => priority(a[0]) - priority(b[0]))
  for (const [method, ...args] of calls) {
    ;(global as (method: string, ...args: unknown[]) => void)(method, ...args)
  }
}

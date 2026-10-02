import { createClient } from './client.ts'
import { createGlobal, replayQueue, type QueueStub } from './global.ts'
import type { TicketpingGlobal } from './api.ts'

declare global {
  interface Window {
    Ticketping?: TicketpingGlobal | QueueStub
  }
}

const existing = window.Ticketping
if (existing && 'version' in existing) {
  console.warn('[Ticketping] The widget was loaded twice; keeping the first copy.')
} else {
  const global = createGlobal(createClient(__VERSION__))
  window.Ticketping = global
  replayQueue(global, existing)
}

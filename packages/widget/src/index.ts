import type { TicketpingApi } from './api.ts'
import { createClient } from './client.ts'

export type * from './api.ts'

/** The widget instance for npm users. Safe to import during SSR; nothing touches the DOM until `init()`. */
export const Ticketping: TicketpingApi = createClient({ version: __VERSION__, integration: 'npm' })

/** A separate widget instance, e.g. a second workspace on the same page. Each needs its own `init()`. */
export function createTicketping(): TicketpingApi {
  return createClient({ version: __VERSION__, integration: 'npm' })
}

import type { TicketpingApi } from './api.ts'
import { createClient } from './client.ts'

export type * from './api.ts'

/** The widget instance for npm users. Safe to import during SSR; nothing touches the DOM until `init()`. */
export const Ticketping: TicketpingApi = createClient(__VERSION__)

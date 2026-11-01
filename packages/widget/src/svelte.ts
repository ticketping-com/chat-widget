import type { TicketpingApi } from './api.ts'
import { createClient } from './client.ts'

export { default as Ticketping } from './adapters/Ticketping.svelte'
export { useTicketping, type TicketpingSvelte } from './adapters/state.svelte.ts'
export type { GetToken, TicketpingUser, UserInput } from './adapters/user-sync.ts'
export type * from './api.ts'

/**
 * A widget instance to pass to `<Ticketping client={...}>`. Keep it in a module and call `open()`,
 * `showNewMessage()` and the rest from any component. Safe to create during SSR.
 */
export function createTicketping(): TicketpingApi {
  return createClient({ version: __VERSION__, integration: 'svelte' })
}

<script lang="ts">
  /* global __VERSION__ */
  import { untrack, type Snippet } from 'svelte'
  import type { InitOptions } from '@ticketping/core'
  import type { TicketpingApi } from '../api.ts'
  import { createUserSync, type GetToken, type UserInput } from './user-sync.ts'
  import { bindTicketping, provideTicketping } from './state.svelte.ts'
  import { createClient } from '../client.ts'

  interface Props extends Omit<InitOptions, 'integration'> {
    user?: UserInput
    getToken?: GetToken
    /**
     * An instance from `createTicketping()`, so the rest of your app can call `open()`,
     * `showNewMessage()` and the other methods on it. Read once. Defaults to a new one owned by
     * this component.
     */
    client?: TicketpingApi
    /** Rendered inside, where `useTicketping()` returns this widget. */
    children?: Snippet
  }

  const { user, getToken, client: provided, children, ...options }: Props = $props()
  const client =
    untrack(() => provided) ?? createClient({ version: __VERSION__, integration: 'svelte' })
  const sync = createUserSync(client, () => getToken)
  const bound = bindTicketping(client)
  provideTicketping(bound)

  $effect(() => {
    client.init({ ...options, integration: 'svelte' })
    const disconnect = bound.connect()
    return () => {
      disconnect()
      client.destroy()
      sync.reset()
    }
  })

  $effect(() => {
    sync.sync(user)
  })
</script>

{@render children?.()}

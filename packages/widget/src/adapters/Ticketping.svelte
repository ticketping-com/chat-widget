<script lang="ts">
  /* global __VERSION__ */
  import type { InitOptions } from '@ticketping/core'
  import { createUserSync, type GetToken, type UserInput } from './user-sync.ts'
  import { createClient } from '../client.ts'

  interface Props extends Omit<InitOptions, 'integration'> {
    user?: UserInput
    getToken?: GetToken
  }

  const { user, getToken, ...options }: Props = $props()
  const client = createClient({ version: __VERSION__, integration: 'svelte' })
  const sync = createUserSync(client, () => getToken)

  $effect(() => {
    client.init({ ...options, integration: 'svelte' })
    return () => {
      client.destroy()
      sync.reset()
    }
  })

  $effect(() => {
    sync.sync(user)
  })
</script>

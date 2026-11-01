<script lang="ts">
  import type { TicketpingApi } from '../../api.ts'
  import Ticketping from '../Ticketping.svelte'
  import Consumer from './Consumer.svelte'

  const {
    client,
    publishableKey,
    apiUrl
  }: { client: TicketpingApi; publishableKey: string; apiUrl: string } = $props()
</script>

<Ticketping {client} {publishableKey} {apiUrl}>
  <Consumer />
</Ticketping>

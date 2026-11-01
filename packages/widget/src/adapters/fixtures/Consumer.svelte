<script lang="ts">
  import { useTicketping } from '../state.svelte.ts'

  const ticketping = useTicketping()
</script>

<p data-testid="state">{ticketping.isOpen ? 'open' : 'closed'} {ticketping.unreadCount}</p>
<button type="button" onclick={() => ticketping.showNewMessage('Order 42')}>Help</button>

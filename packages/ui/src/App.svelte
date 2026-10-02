<script lang="ts">
  import type { Store, WidgetState } from '@ticketping/core'
  import { fromStore } from 'svelte/store'
  import Launcher from './Launcher.svelte'

  interface Props {
    store: Store<WidgetState>
    onLauncherClick: () => void
  }

  const { store, onLauncherClick }: Props = $props()
  const widget = $derived(fromStore(store))
</script>

<div class="tp-root" dir="ltr">
  {#if widget.current.launcherVisible}
    <Launcher
      open={widget.current.open}
      unreadCount={widget.current.unreadCount}
      onclick={onLauncherClick}
    />
  {/if}
</div>

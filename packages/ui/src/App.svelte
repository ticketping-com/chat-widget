<script lang="ts">
  import { messagePreview, type WidgetController } from '@ticketping/core'
  import { fromStore } from 'svelte/store'
  import Launcher from './Launcher.svelte'
  import Panel from './Panel.svelte'
  import { playReplyChime, shouldChime, unlockReplyChime } from './lib/sound.ts'
  import { createTabTitle, tabAlert, tabCountLabel } from './lib/tab-title.ts'

  interface Props {
    controller: WidgetController
  }

  const { controller }: Props = $props()
  const store = $derived(fromStore(controller))
  const widget = $derived(store.current)
  const visible = $derived(widget.status === 'ready' || widget.status === 'preview')
  const isOpen = $derived(widget.open)

  let launcher: HTMLButtonElement | undefined = $state()
  let wasOpen = $state(false)
  /** Stays mounted through the close animation. */
  let panelMounted = $state(false)
  let panelOpen = $state(false)

  $effect(() => {
    if (wasOpen && !isOpen) launcher?.focus()
    wasOpen = isOpen
  })

  $effect(() => {
    const unlock = () => unlockReplyChime()
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  })

  // Prime once the widget is ready so existing unread on load stays quiet.
  let primedUnread = false
  let lastUnread = 0
  let lastChimeAt = 0
  $effect(() => {
    const count = widget.unreadCount
    const open = widget.open
    const preview = widget.preview
    const ready = widget.status === 'ready'
    if (!ready || preview) {
      lastUnread = count
      return
    }
    if (!primedUnread) {
      primedUnread = true
      lastUnread = count
      return
    }
    const now = Date.now()
    if (
      shouldChime({ previous: lastUnread, next: count, open, preview }) &&
      now - lastChimeAt > 800
    ) {
      lastChimeAt = now
      playReplyChime()
    }
    lastUnread = count
  })

  const titles = createTabTitle(document)
  $effect(() => () => titles.destroy())
  $effect(() => {
    const ready = widget.status === 'ready'
    const preview = widget.preview
    const open = widget.open
    const count = widget.unreadCount
    const label =
      ready && !preview && !open ? tabCountLabel(count, (n) => widget.i18n.formatNumber(n)) : null
    const latest = widget.conversations.find((item) => item.unreadCount > 0)
    const last = latest?.lastMessage
    const line = last && last.sender.type !== 'USER' ? messagePreview(last, widget.i18n) : ''
    titles.update({
      active: label !== null,
      countLabel: label,
      alert: tabAlert(line, widget.i18n.t('title.newMessages', { count: Math.max(count, 1) }))
    })
  })

  $effect(() => {
    const open = isOpen
    if (open) {
      panelMounted = true
      const frame = requestAnimationFrame(() => {
        panelOpen = true
      })
      return () => cancelAnimationFrame(frame)
    }
    panelOpen = false
    if (!panelMounted) return
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(
      () => {
        if (!isOpen) panelMounted = false
      },
      reduce ? 0 : 300
    )
    return () => clearTimeout(timer)
  })
</script>

{#if visible}
  <div
    class="tp-root"
    dir={widget.dir}
    lang={widget.locale}
    style:--tp-nav={widget.dir === 'rtl' ? -1 : 1}
  >
    {#if panelMounted}
      <Panel {controller} {widget} open={panelOpen} />
    {/if}
    {#if widget.launcherVisible}
      <Launcher
        bind:button={launcher}
        open={widget.open}
        unreadCount={widget.unreadCount}
        i18n={widget.i18n}
        onclick={() => controller.toggle()}
      />
    {/if}
  </div>
{/if}

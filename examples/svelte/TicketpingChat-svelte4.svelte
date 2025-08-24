<script>
  import { onMount } from 'svelte'
  import TicketpingChatWidget from '@ticketping/chat-widget/svelte4'
  import('@ticketping/chat-widget/style')

  export let appId = 'tp-spendcrypto-96841'
  export let teamSlug = 'spendcrypto'
  export let teamLogoIcon = 'https://spendcrypto.com/android-chrome-192x192.png'
  export let apiBase = 'https://api.ticketping.com'
  export let wsBase = 'wss://api.ticketping.com'
  export let theme = {
    primaryColor: '#FF78B1', // peach/accent
    primaryButtonBg: '#FF78B1', // peach/accent
    primaryButtonText: '#FFFFFF', // white
    primaryHover: '#FF529A', // peach-600
    textPrimary: '#C4C4E6', // mist-200 (main text)
    textSecondary: '#9D9DC8', // mist-300 (secondary text)
    textMuted: '#71719C', // mist-400 (muted text)
    textWhite: '#fff', // white
    background: '#020205', // black
    backgroundSecondary: '#0E0E0E', // bone-800
    backgroundTertiary: '#1C1C1C', // bone-600
    border: '#2E2E2E', // bone-500
    borderLight: '#484848', // bone-400
    borderCard: '#2E2E2E', // bone-500
    notificationBg: '#F2C94C', // warning
    successColor: '#4CB782', // success
    offlineColor: '#7C7C7C', // bone-300
    errorBg: '#FA6563', // error (with opacity)
    errorText: '#FA6563', // error
    errorBorder: '#FA6563', // error
    shadowLight: 'rgba(2, 2, 5, 0.2)',
    shadowMedium: 'rgba(2, 2, 5, 0.3)',
    shadowDark: 'rgba(2, 2, 5, 0.4)',
    overlayLight: 'rgba(255, 255, 255, 0.1)'
  }

  let tpChatWidget = null
  let userJWT = null
  let jwtLoaded = false

  const getChatJWT = async () => {
    // TODO: Replace with your own API endpoint and proper auth logic
    // This is just a placeholder for the example
    const response = await fetch('/api/v1/support-portal/chat-jwt/')

    if (response.ok) {
      const res = await response.json()
      return res['jwt']
    } else {
      return ''
    }
  }

  onMount(async () => {
    try {
      userJWT = await getChatJWT()
    } catch (error) {
      console.error('Failed to fetch JWT:', error)
    } finally {
      jwtLoaded = true
    }
  })
</script>

{#if jwtLoaded}
  <TicketpingChatWidget
    bind:this={tpChatWidget}
    {appId}
    {teamSlug}
    {teamLogoIcon}
    {apiBase}
    {wsBase}
    {theme}
    {userJWT}
  />
{/if}

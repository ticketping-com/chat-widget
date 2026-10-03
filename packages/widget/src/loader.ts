// The CDN snippet. Budget: under 2 KB gzipped, so no imports.
// It installs a queueing `window.Ticketping`, auto-inits from `data-key`, and loads the
// versioned bundle when the browser is idle, or right away if the page asks to open the widget.

interface Stub {
  (...args: unknown[]): void
  q: unknown[][]
  version?: string
}

const EAGER: string[] = [
  'open',
  'toggle',
  'showNewMessage',
  'showConversation',
  'showSpace',
  'preview'
]

;(() => {
  const w = window as unknown as { Ticketping?: Stub }
  if (w.Ticketping?.version) return

  const script = document.currentScript as HTMLScriptElement | null
  const base = script?.src || location.href
  let requested = false

  const load = () => {
    if (requested) return
    requested = true
    const el = document.createElement('script')
    el.src = new URL(`${__VERSION__}/widget.js`, base).href
    el.type = 'module'
    el.async = true
    document.head.append(el)
  }

  const stub = function (...args: unknown[]) {
    stub.q.push(args)
    if (EAGER.includes(args[0] as string)) load()
  } as Stub
  stub.q = Array.from(w.Ticketping?.q ?? [], (args) => Array.from(args))
  w.Ticketping = stub

  const key = script?.dataset.key
  if (key && !stub.q.some((args) => args[0] === 'init')) {
    stub.q.unshift(['init', { publishableKey: key }])
  }
  if (stub.q.some((args) => EAGER.includes(args[0] as string))) load()

  const idle = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(load, { timeout: 3000 })
      : setTimeout(load, 1)
  if (document.readyState === 'complete') idle()
  else addEventListener('load', idle, { once: true })
})()

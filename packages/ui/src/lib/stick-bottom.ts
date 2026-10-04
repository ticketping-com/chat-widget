/** How close to the end counts as "following" new messages. */
const PIN_SLOP = 80
/** Instant follow for typing-sized shifts; ease for a new bubble. */
const EASE_DELTA = 40
const EASE_MS = 240

function maxTop(el: HTMLElement): number {
  return Math.max(0, el.scrollHeight - el.clientHeight)
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Stick to the newest message once the thread overflows. Short threads stay
 * at the top of the pane and grow downward.
 */
export function createStickBottom() {
  let scroller: HTMLElement | null = null
  let inner: HTMLElement | null = null
  let observer: ResizeObserver | null = null
  let pinned = true
  let anim = 0
  let ignoreScroll = false

  function lockScroll(el: HTMLElement, top: number) {
    ignoreScroll = true
    el.scrollTop = top
    requestAnimationFrame(() => {
      ignoreScroll = false
    })
  }

  function cancelAnim() {
    if (anim) cancelAnimationFrame(anim)
    anim = 0
  }

  function jump() {
    if (!scroller) return
    cancelAnim()
    pinned = true
    lockScroll(scroller, maxTop(scroller))
  }

  function ease() {
    if (!scroller) return
    pinned = true
    if (reducedMotion()) {
      jump()
      return
    }
    cancelAnim()
    const el = scroller
    const start = el.scrollTop
    const from = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - from) / EASE_MS)
      const k = 1 - (1 - t) ** 3
      ignoreScroll = true
      el.scrollTop = start + (maxTop(el) - start) * k
      if (t < 1) {
        anim = requestAnimationFrame(tick)
        return
      }
      anim = 0
      requestAnimationFrame(() => {
        ignoreScroll = false
      })
    }
    anim = requestAnimationFrame(tick)
  }

  function follow() {
    if (!scroller || !pinned || anim) return
    const target = maxTop(scroller)
    if (target <= 1) return
    const distance = target - scroller.scrollTop
    if (Math.abs(distance) <= 1) return
    if (Math.abs(distance) > EASE_DELTA && !reducedMotion()) {
      ease()
      return
    }
    lockScroll(scroller, target)
  }

  function onScroll(): boolean {
    if (!scroller || ignoreScroll || anim) return pinned
    pinned = maxTop(scroller) - scroller.scrollTop < PIN_SLOP
    return pinned
  }

  function attach(nextScroller: HTMLElement, nextInner: HTMLElement) {
    release()
    scroller = nextScroller
    inner = nextInner
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(follow)
      observer.observe(inner)
      observer.observe(scroller)
    }
    if (pinned) jump()
  }

  function release() {
    cancelAnim()
    observer?.disconnect()
    observer = null
    scroller = null
    inner = null
  }

  return {
    get pinned() {
      return pinned
    },
    attach,
    release,
    jump,
    ease,
    follow,
    onScroll
  }
}

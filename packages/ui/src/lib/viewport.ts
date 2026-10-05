/** Matches the fullscreen panel breakpoint in Panel.svelte. */
export const MOBILE_MAX_WIDTH = 480

/**
 * Layout height minus visual height above this means the keyboard is open.
 * Browser chrome is smaller than this; a phone keyboard is not.
 */
const KEYBOARD_GAP = 160

export interface ViewportSnapshot {
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
  layoutWidth: number
  layoutHeight: number
}

export interface MobileFrame {
  top: number
  left: number
  width: number
  height: number
  /** The on-screen keyboard is covering the bottom, so the home-indicator inset is dropped. */
  keyboard: boolean
}

/**
 * Fullscreen frame for an open panel on a narrow viewport. `null` on desktop
 * and when the panel is closed, so the launcher stays in the corner.
 */
export function mobileFrame(view: ViewportSnapshot, open: boolean): MobileFrame | null {
  if (!open || view.layoutWidth <= 0 || view.layoutWidth > MOBILE_MAX_WIDTH) return null
  return {
    top: view.offsetTop,
    left: view.offsetLeft,
    width: view.width,
    height: view.height,
    keyboard: view.layoutHeight - view.height > KEYBOARD_GAP
  }
}

export function readViewport(): ViewportSnapshot {
  const vv = window.visualViewport
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    offsetLeft: vv?.offsetLeft ?? 0,
    layoutWidth: window.innerWidth,
    layoutHeight: window.innerHeight
  }
}

interface SavedScroll {
  position: string
  top: string
  left: string
  right: string
  width: string
  scrollY: number
}

let savedScroll: SavedScroll | null = null

/** Freeze the host page while the mobile sheet is open, then restore the scroll offset. */
export function setPageScrollLocked(lock: boolean): void {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!body) return
  if (lock) {
    if (savedScroll) return
    savedScroll = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      scrollY: window.scrollY
    }
    body.style.position = 'fixed'
    body.style.top = `-${savedScroll.scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    return
  }
  if (!savedScroll) return
  const scrollY = savedScroll.scrollY
  body.style.position = savedScroll.position
  body.style.top = savedScroll.top
  body.style.left = savedScroll.left
  body.style.right = savedScroll.right
  body.style.width = savedScroll.width
  savedScroll = null
  window.scrollTo(0, scrollY)
}

/** Hold open-only layout (mobile frame, hide-launcher) until the panel exit finishes. */
export const CLOSE_HOLD_MS = 300

let releaseTimer = 0

function writeFrame(host: HTMLElement, frame: MobileFrame): void {
  host.dataset.mobile = 'true'
  host.style.setProperty('--tp-vv-top', `${frame.top}px`)
  host.style.setProperty('--tp-vv-left', `${frame.left}px`)
  host.style.setProperty('--tp-vv-width', `${frame.width}px`)
  host.style.setProperty('--tp-vv-height', `${frame.height}px`)
  // Keyboard open: the home indicator is gone, so don't pad the composer twice.
  if (frame.keyboard) host.style.setProperty('--tp-safe-bottom', '0px')
  else host.style.removeProperty('--tp-safe-bottom')
}

function clearFrame(host: HTMLElement): void {
  delete host.dataset.mobile
  host.style.removeProperty('--tp-vv-top')
  host.style.removeProperty('--tp-vv-left')
  host.style.removeProperty('--tp-vv-width')
  host.style.removeProperty('--tp-vv-height')
  host.style.removeProperty('--tp-safe-bottom')
  setPageScrollLocked(false)
}

/**
 * Size the host to the visual viewport while the mobile panel is open.
 * On close, hold that frame until the panel's exit animation finishes.
 */
export function applyMobileFrame(host: HTMLElement, open: boolean): void {
  const frame = mobileFrame(readViewport(), true)
  if (!frame) {
    window.clearTimeout(releaseTimer)
    releaseTimer = 0
    clearFrame(host)
    return
  }
  if (open) {
    window.clearTimeout(releaseTimer)
    releaseTimer = 0
    writeFrame(host, frame)
    setPageScrollLocked(true)
    return
  }
  if (releaseTimer) return
  const reduce =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  releaseTimer = window.setTimeout(
    () => {
      releaseTimer = 0
      clearFrame(host)
    },
    reduce ? 0 : CLOSE_HOLD_MS
  )
}

export function watchMobileFrame(host: HTMLElement, isOpen: () => boolean): () => void {
  const sync = () => applyMobileFrame(host, isOpen())
  window.visualViewport?.addEventListener('resize', sync)
  window.visualViewport?.addEventListener('scroll', sync)
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
  return () => {
    window.visualViewport?.removeEventListener('resize', sync)
    window.visualViewport?.removeEventListener('scroll', sync)
    window.removeEventListener('resize', sync)
    window.removeEventListener('orientationchange', sync)
    window.clearTimeout(releaseTimer)
    releaseTimer = 0
    clearFrame(host)
  }
}

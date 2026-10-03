/** A reply arrived while the panel was closed, after the first unread count was seen. */
export function shouldChime(input: {
  previous: number
  next: number
  open: boolean
  preview: boolean
}): boolean {
  return !input.preview && !input.open && input.next > input.previous
}

let audio: AudioContext | null = null

function context(): AudioContext | null {
  if (audio) return audio
  const Ctx = window.AudioContext ?? window.webkitAudioContext
  if (!Ctx) return null
  audio = new Ctx()
  return audio
}

/** Resume audio after a user gesture. Browsers block a chime until then. */
export function unlockReplyChime(): void {
  const ctx = context()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
}

/**
 * Two short sine notes. Quiet enough to sit under a notification, with no
 * audio file in the bundle.
 */
export function playReplyChime(): void {
  const ctx = context()
  if (!ctx) return
  const start = () => {
    if (ctx.state !== 'running') return
    const now = ctx.currentTime
    tone(ctx, 784, now, 0.08, 0.08)
    tone(ctx, 1174.66, now + 0.09, 0.12, 0.06)
  }
  if (ctx.state === 'suspended') {
    void ctx.resume().then(start)
    return
  }
  start()
}

function tone(ctx: AudioContext, freq: number, when: number, duration: number, peak: number): void {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  amp.gain.setValueAtTime(0.0001, when)
  amp.gain.exponentialRampToValueAtTime(peak, when + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration)
  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(when)
  osc.stop(when + duration + 0.02)
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

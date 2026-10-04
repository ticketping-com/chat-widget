import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStickBottom } from './stick-bottom.ts'

function box(scrollHeight: number, clientHeight: number, scrollTop = 0) {
  const el = document.createElement('div')
  Object.defineProperties(el, {
    scrollHeight: { configurable: true, get: () => scrollHeight },
    clientHeight: { configurable: true, get: () => clientHeight },
    offsetHeight: { configurable: true, get: () => scrollHeight }
  })
  el.scrollTop = scrollTop
  return el
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createStickBottom', () => {
  it('jumps to the newest message when attached', () => {
    const stick = createStickBottom()
    const scroller = box(800, 300, 0)
    const feed = box(800, 800)
    stick.attach(scroller, feed)
    expect(scroller.scrollTop).toBe(500)
    stick.release()
  })

  it('unpins once the visitor scrolls away from the bottom', async () => {
    const stick = createStickBottom()
    const scroller = box(800, 300, 500)
    const feed = box(800, 800)
    stick.attach(scroller, feed)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    scroller.scrollTop = 20
    expect(stick.onScroll()).toBe(false)
    stick.release()
  })

  it('stays pinned within the bottom slop', () => {
    const stick = createStickBottom()
    const scroller = box(800, 300, 500)
    const feed = box(800, 800)
    stick.attach(scroller, feed)
    scroller.scrollTop = 440
    expect(stick.onScroll()).toBe(true)
    stick.release()
  })

  it('does not scroll while the thread still fits on screen', () => {
    const stick = createStickBottom()
    const scroller = box(300, 300, 0)
    const feed = box(120, 120)
    stick.attach(scroller, feed)
    expect(scroller.scrollTop).toBe(0)
    stick.follow()
    expect(scroller.scrollTop).toBe(0)
    stick.release()
  })
})

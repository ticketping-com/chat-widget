import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyMobileFrame, isMobileLayout, mobileFrame, type ViewportSnapshot } from './viewport.ts'

const phone: ViewportSnapshot = {
  width: 390,
  height: 700,
  offsetTop: 0,
  offsetLeft: 0,
  layoutWidth: 390,
  layoutHeight: 844
}

describe('mobileFrame', () => {
  it('fills the visual viewport while the panel is open on a phone', () => {
    expect(mobileFrame(phone, true)).toEqual({
      top: 0,
      left: 0,
      width: 390,
      height: 700,
      keyboard: false
    })
  })

  it('follows the visual viewport when the keyboard shifts it', () => {
    const frame = mobileFrame({ ...phone, height: 380, offsetTop: 52, layoutHeight: 844 }, true)
    expect(frame).toMatchObject({ top: 52, height: 380, keyboard: true })
  })

  it('keeps the home-indicator inset when the keyboard is closed', () => {
    expect(mobileFrame({ ...phone, height: 800, layoutHeight: 844 }, true)?.keyboard).toBe(false)
  })

  it('stays in the corner on desktop and when the panel is closed', () => {
    expect(mobileFrame({ ...phone, layoutWidth: 1280, width: 1280 }, true)).toBeNull()
    expect(mobileFrame(phone, false)).toBeNull()
    expect(mobileFrame({ ...phone, layoutWidth: 0 }, true)).toBeNull()
  })
})

describe('isMobileLayout', () => {
  it('matches the fullscreen panel breakpoint', () => {
    expect(isMobileLayout(phone)).toBe(true)
    expect(isMobileLayout({ ...phone, layoutWidth: 480 })).toBe(true)
    expect(isMobileLayout({ ...phone, layoutWidth: 481, width: 481 })).toBe(false)
    expect(isMobileLayout({ ...phone, layoutWidth: 0 })).toBe(false)
  })
})

describe('applyMobileFrame', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.removeAttribute('style')
  })

  it('keeps the open sheet shown over host hide-on-scroll rules', () => {
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('scrollTo', () => {})
    const host = document.createElement('ticketping-widget')
    applyMobileFrame(host, true)
    expect(host.style.getPropertyValue('opacity')).toBe('1')
    expect(host.style.getPropertyPriority('opacity')).toBe('important')
    expect(host.style.getPropertyPriority('pointer-events')).toBe('important')

    vi.stubGlobal('innerWidth', 1024)
    applyMobileFrame(host, true)
    expect(host.style.getPropertyValue('opacity')).toBe('')
    expect(host.style.getPropertyValue('pointer-events')).toBe('')
  })
})

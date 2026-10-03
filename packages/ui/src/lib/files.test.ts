import { describe, expect, it } from 'vitest'
import { canSend, filesFromPaste, messageTooLong, takeFiles } from './files.ts'

describe('canSend', () => {
  it('requires text, an attachment, or a GIF', () => {
    expect(canSend('', 0, false)).toBe(false)
    expect(canSend('   ', 0, false)).toBe(false)
    expect(canSend('hello', 0, false)).toBe(true)
    expect(canSend('', 1, false)).toBe(true)
    expect(canSend('', 0, true)).toBe(true)
  })

  it('rejects text over the protocol limit', () => {
    expect(messageTooLong('x'.repeat(10_001))).toBe(true)
    expect(canSend('x'.repeat(10_001), 0, false)).toBe(false)
  })
})

describe('takeFiles', () => {
  const file = (name: string, type: string, size: number) => ({ name, type, size }) as File

  it('accepts allowed types under the size and count limits', () => {
    const { accepted, rejected } = takeFiles(
      [file('a.png', 'image/png', 12), file('b.pdf', 'application/pdf', 20)],
      0
    )
    expect(accepted).toHaveLength(2)
    expect(rejected).toHaveLength(0)
  })

  it('rejects oversized, unknown, and extra files', () => {
    const huge = file('big.png', 'image/png', 10 * 1024 * 1024 + 1)
    const exe = file('x.exe', 'application/x-msdownload', 10)
    const extra = file('sixth.png', 'image/png', 10)
    const already = [
      file('1.png', 'image/png', 1),
      file('2.png', 'image/png', 1),
      file('3.png', 'image/png', 1),
      file('4.png', 'image/png', 1),
      file('5.png', 'image/png', 1)
    ]
    expect(takeFiles([huge], 0).rejected[0]?.reason).toBe('tooLarge')
    expect(takeFiles([exe], 0).rejected[0]?.reason).toBe('typeNotAllowed')
    expect(takeFiles([...already, extra], 0).rejected[0]?.reason).toBe('tooMany')
    expect(takeFiles([extra], 5).rejected[0]?.reason).toBe('tooMany')
  })
})

describe('filesFromPaste', () => {
  const file = (name: string, type: string, size = 8) =>
    new File([new Uint8Array(size)], name, { type, lastModified: 5 })

  it('keeps a pasted image listed in both files and items once', () => {
    const shot = file('image.png', 'image/png')
    const pasted = filesFromPaste({
      files: [shot],
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => shot }]
    })
    expect(pasted).toEqual([shot])
  })

  it('names a screenshot that arrives without a filename', () => {
    const shot = file('', 'image/png', 12)
    const pasted = filesFromPaste({
      files: { length: 0 },
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => shot }]
    })
    expect(pasted).toHaveLength(1)
    expect(pasted[0]?.name).toMatch(/^screenshot-\d+-0\.png$/)
    expect(pasted[0]?.type).toBe('image/png')
  })

  it('ignores a text-only paste', () => {
    expect(
      filesFromPaste({
        files: { length: 0 },
        items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }]
      })
    ).toEqual([])
    expect(filesFromPaste(null)).toEqual([])
  })
})

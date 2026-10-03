import {
  MAX_ATTACHMENTS,
  MAX_MESSAGE_LENGTH,
  MAX_UPLOAD_BYTES,
  isAllowedFileType
} from '@ticketping/core'

export const FILE_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,application/msword,application/rtf,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.text'

export type FileRejectReason = 'tooLarge' | 'tooMany' | 'typeNotAllowed'

export interface FileReject {
  name: string
  reason: FileRejectReason
}

export function canSend(text: string, attachmentCount: number, hasGif: boolean): boolean {
  const trimmed = text.trim()
  if (trimmed.length > MAX_MESSAGE_LENGTH) return false
  return trimmed.length > 0 || attachmentCount > 0 || hasGif
}

export function messageTooLong(text: string): boolean {
  return text.trim().length > MAX_MESSAGE_LENGTH
}

/** Keep files that pass protocol 4.6 limits. Excess files are rejected as `tooMany`. */
export function takeFiles(
  incoming: Iterable<File>,
  already: number
): {
  accepted: File[]
  rejected: FileReject[]
} {
  const accepted: File[] = []
  const rejected: FileReject[] = []
  let count = already
  for (const file of incoming) {
    if (count >= MAX_ATTACHMENTS) {
      rejected.push({ name: file.name, reason: 'tooMany' })
      continue
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push({ name: file.name, reason: 'tooLarge' })
      continue
    }
    if (!isAllowedFileType(file.type)) {
      rejected.push({ name: file.name, reason: 'typeNotAllowed' })
      continue
    }
    accepted.push(file)
    count += 1
  }
  return { accepted, rejected }
}

export function formatMaxSize(): string {
  return '10 MB'
}

/** A clipboard entry that may hold a file. Screenshots often arrive only here, not in `files`. */
export interface PasteItem {
  kind: string
  type: string
  getAsFile(): File | null
}

export interface PasteSource {
  files?: ArrayLike<File> | null
  items?: ArrayLike<PasteItem> | null
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv'
}

/**
 * Files from a paste event. A screenshot is an image with an empty name (or the
 * browser's placeholder "blob"); those get a real filename so upload and the
 * pending row can show one. The same image listed in both `files` and `items`
 * is kept once.
 */
export function filesFromPaste(source: PasteSource | null): File[] {
  if (!source) return []
  const out: File[] = []
  const seen = new Set<string>()
  const add = (file: File | null) => {
    if (!file || file.size <= 0) return
    const key = `${file.type}:${file.size}:${file.lastModified}:${file.name}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(namedPasteFile(file, out.length))
  }
  const listed = source.files
  if (listed) {
    for (let i = 0; i < listed.length; i++) add(listed[i] ?? null)
  }
  const items = source.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item || item.kind !== 'file') continue
      add(item.getAsFile())
    }
  }
  return out
}

function namedPasteFile(file: File, index: number): File {
  const name = file.name?.trim()
  if (name && name !== 'blob') return file
  const ext = EXT_BY_TYPE[file.type] ?? (file.type.startsWith('image/') ? 'png' : 'bin')
  return new File([file], `screenshot-${Date.now()}-${index}.${ext}`, {
    type: file.type,
    lastModified: file.lastModified || Date.now()
  })
}

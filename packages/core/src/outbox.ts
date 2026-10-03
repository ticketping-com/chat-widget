import type { Frame } from './socket.ts'
import type { WidgetError } from './types.ts'

export const ACK_TIMEOUT_MS = 10_000
export const MAX_SEND_ATTEMPTS = 3

export interface OutgoingMessage {
  clientId: string
  /** `null` starts a new conversation. Filled in for queued followers once the first one is acked. */
  conversationId: string | null
  text: string
  attachmentIds: string[]
  gif?: { provider: 'giphy'; id: string }
}

interface Entry {
  message: OutgoingMessage
  attempts: number
  state: 'queued' | 'inflight' | 'failed'
  timer?: ReturnType<typeof setTimeout>
}

export interface OutboxOptions {
  /** Sends on the live connection; `false` when it isn't open. */
  send(frame: Omit<Frame, 'v'>): boolean
  onFailed(clientId: string, error: WidgetError): void
  /** No `ack` within 10 s: the connection is presumed dead (protocol 6.3). */
  onAckTimeout(): void
  ackTimeoutMs?: number
  maxAttempts?: number
}

/**
 * The outgoing queue (protocol 6.3). It survives reconnects, not page reloads. Messages for a
 * conversation that doesn't exist yet are held back until the first one's `ack` names it, so a
 * fast second message can't start a second conversation.
 */
export interface Outbox {
  readonly size: number
  has(clientId: string): boolean
  add(message: OutgoingMessage): void
  /** Sends everything sendable. Call after `auth.ok` and after `add`. */
  flush(): void
  /** Applies an `ack`; returns the entry's message, or `undefined` for unknown or repeated acks. */
  ack(clientId: string, conversationId: string): OutgoingMessage | undefined
  /** A server `error` frame for this message: fail it now, no automatic retry. */
  reject(clientId: string, error: WidgetError): void
  /** The connection dropped: in-flight messages go back to the queue. */
  disconnected(): void
  retry(clientId: string): boolean
  remove(clientId: string): void
  clear(): void
}

export function createOutbox(options: OutboxOptions): Outbox {
  const ackTimeout = options.ackTimeoutMs ?? ACK_TIMEOUT_MS
  const maxAttempts = options.maxAttempts ?? MAX_SEND_ATTEMPTS
  const entries = new Map<string, Entry>()

  const exhausted: WidgetError = {
    code: 'delivery_failed',
    message: `No acknowledgement after ${maxAttempts} attempts.`
  }

  function fail(entry: Entry, error: WidgetError) {
    clearTimeout(entry.timer)
    entry.state = 'failed'
    options.onFailed(entry.message.clientId, error)
  }

  function sendEntry(entry: Entry): boolean {
    const { message } = entry
    const data: Record<string, unknown> = {
      clientId: message.clientId,
      conversationId: message.conversationId,
      body: { text: message.text },
      attachmentIds: message.attachmentIds
    }
    if (message.gif) data.gif = message.gif
    if (!options.send({ type: 'message.send', id: message.clientId, data })) return false
    entry.attempts++
    entry.state = 'inflight'
    entry.timer = setTimeout(() => {
      if (entry.state !== 'inflight') return
      if (entry.attempts >= maxAttempts) fail(entry, exhausted)
      else entry.state = 'queued'
      options.onAckTimeout()
    }, ackTimeout)
    return true
  }

  return {
    get size() {
      let count = 0
      for (const entry of entries.values()) if (entry.state !== 'failed') count++
      return count
    },
    has: (clientId) => entries.has(clientId),
    add(message) {
      entries.set(message.clientId, { message: { ...message }, attempts: 0, state: 'queued' })
    },
    flush() {
      let newConversationBusy = false
      for (const entry of entries.values()) {
        if (entry.state === 'failed') continue
        const starts = entry.message.conversationId === null
        if (starts && newConversationBusy) continue
        if (starts) newConversationBusy = true
        if (entry.state !== 'queued') continue
        if (entry.attempts >= maxAttempts) {
          fail(entry, exhausted)
          if (starts) newConversationBusy = false
          continue
        }
        if (!sendEntry(entry)) return
      }
    },
    ack(clientId, conversationId) {
      const entry = entries.get(clientId)
      if (!entry) return undefined
      clearTimeout(entry.timer)
      entries.delete(clientId)
      if (entry.message.conversationId === null) {
        for (const other of entries.values()) {
          if (other.message.conversationId === null) other.message.conversationId = conversationId
        }
      }
      this.flush()
      return entry.message
    },
    reject(clientId, error) {
      const entry = entries.get(clientId)
      if (entry && entry.state !== 'failed') fail(entry, error)
      this.flush()
    },
    disconnected() {
      for (const entry of entries.values()) {
        if (entry.state !== 'inflight') continue
        clearTimeout(entry.timer)
        if (entry.attempts >= maxAttempts) fail(entry, exhausted)
        else entry.state = 'queued'
      }
    },
    retry(clientId) {
      const entry = entries.get(clientId)
      if (!entry || entry.state !== 'failed') return false
      entry.attempts = 0
      entry.state = 'queued'
      this.flush()
      return true
    },
    remove(clientId) {
      const entry = entries.get(clientId)
      if (!entry) return
      clearTimeout(entry.timer)
      entries.delete(clientId)
      this.flush()
    },
    clear() {
      for (const entry of entries.values()) clearTimeout(entry.timer)
      entries.clear()
    }
  }
}

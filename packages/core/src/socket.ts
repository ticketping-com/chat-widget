import { backoffDelay } from './backoff.ts'
import type { Platform, SocketLike } from './platform.ts'
import type { WidgetError } from './types.ts'

/** Every socket frame (protocol 6.2). */
export interface Frame {
  v: 1
  type: string
  id?: string
  cursor?: string
  data: Record<string, unknown>
}

export interface AuthData {
  publishableKey: string
  visitorToken: string
  accessToken?: string
}

export type TransportStatus =
  /** Not started, or stopped by `stop()`. */
  | 'idle'
  | 'connecting'
  /** Socket open, `auth` sent, waiting for `auth.ok`. */
  | 'authenticating'
  | 'open'
  /** Waiting to reconnect: backoff, credential recovery, or a hidden page (6.7). */
  | 'waiting'
  /** Gave up after `4003` or repeated `4000`. Only `start()` resumes. */
  | 'stopped'

export type RecoverReason = 'credentials_invalid' | 'access_expired'

export interface TransportOptions {
  platform: Platform
  url(): string
  heartbeatSeconds(): number
  auth(): AuthData | null
  onAuthOk(data: Record<string, unknown>): void
  onFrame(frame: Frame): void
  onStatus(status: TransportStatus): void
  /** The connection dropped; frames waiting for a reply must be re-sent on the next one. */
  onDisconnect(): void
  onFatal(error: WidgetError): void
  /**
   * `4004` / `4011`: fix credentials (protocol 2.4, 6.6). `attempt` counts consecutive closes
   * with the same code. Resolve `false` to stay stopped.
   */
  recover(reason: RecoverReason, attempt: number): Promise<boolean>
  /** True while messages wait in the outgoing queue: they override the hidden-page rule. */
  hasPending(): boolean
}

export interface SocketTransport {
  readonly status: TransportStatus
  /** The latest replay cursor (protocol 6.4). */
  cursor: string | null
  /** Connects if not already running. */
  start(): void
  stop(): void
  /** Drops the current connection and connects again now, e.g. after `identify` (6.5). */
  reconnect(): void
  /** Sends on an authenticated connection. Returns `false` when it isn't open. */
  send(frame: Omit<Frame, 'v'>): boolean
  /** Connects now if waiting for backoff or visibility (outgoing message, `online` event). */
  wake(): void
}

export const PONG_TIMEOUT_MS = 10_000
export const STABLE_AFTER_MS = 60_000
export const RATE_LIMIT_DELAY_MS = 30_000
export const RESTART_JITTER_MS = 2_000

export function createSocketTransport(options: TransportOptions): SocketTransport {
  const { platform } = options
  let status: TransportStatus = 'idle'
  let ws: SocketLike | null = null
  let running = false
  /** Bumped on stop/reconnect so callbacks of an old connection or recovery are ignored. */
  let run = 0
  let attempt = 0
  let protocolErrors = 0
  let lastRecoverCode = 0
  let recoverAttempts = 0
  let waitingForVisible = false
  let recovering = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  let pongTimer: ReturnType<typeof setTimeout> | undefined
  let stableTimer: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: (() => void)[] = []

  function setStatus(next: TransportStatus) {
    if (status === next) return
    status = next
    options.onStatus(next)
  }

  function clearConnectionTimers() {
    clearInterval(heartbeatTimer)
    clearTimeout(pongTimer)
    clearTimeout(stableTimer)
    heartbeatTimer = pongTimer = stableTimer = undefined
  }

  function drop(socket: SocketLike, code = 1000) {
    socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null
    try {
      socket.close(code)
    } catch {
      // Already closed.
    }
  }

  function connect() {
    clearTimeout(retryTimer)
    retryTimer = undefined
    if (!running) return
    if (platform.isHidden() && !options.hasPending()) {
      waitingForVisible = true
      setStatus('waiting')
      return
    }
    waitingForVisible = false
    const auth = options.auth()
    if (!auth) {
      setStatus('waiting')
      return
    }
    setStatus('connecting')
    let socket: SocketLike
    try {
      socket = platform.createSocket(options.url())
    } catch {
      schedule(backoffDelay(attempt++, platform.random))
      return
    }
    ws = socket
    socket.onopen = () => {
      if (ws !== socket) return
      setStatus('authenticating')
      const data: Record<string, unknown> = { ...options.auth() }
      if (transport.cursor) data.resumeFrom = transport.cursor
      socket.send(JSON.stringify({ v: 1, type: 'auth', data }))
    }
    socket.onmessage = (event) => {
      if (ws === socket) receive(event.data)
    }
    socket.onclose = (event) => {
      if (ws === socket) closed(event.code)
    }
    socket.onerror = () => {
      // A close event always follows.
    }
  }

  function receive(raw: unknown) {
    if (typeof raw !== 'string') return
    let frame: Frame
    try {
      frame = JSON.parse(raw) as Frame
    } catch {
      return
    }
    if (!frame || typeof frame.type !== 'string') return
    // Any frame proves the connection is alive.
    clearTimeout(pongTimer)
    pongTimer = undefined
    const data = (frame.data ?? {}) as Record<string, unknown>

    if (status === 'authenticating') {
      if (frame.type !== 'auth.ok') return
      if (typeof data.cursor === 'string') transport.cursor = data.cursor
      setStatus('open')
      lastRecoverCode = 0
      recoverAttempts = 0
      startHeartbeat()
      stableTimer = setTimeout(() => {
        attempt = 0
        protocolErrors = 0
      }, STABLE_AFTER_MS)
      options.onAuthOk(data)
      return
    }
    if (status !== 'open' || frame.type === 'pong') return
    if (typeof frame.cursor === 'string') transport.cursor = frame.cursor
    options.onFrame({ ...frame, data })
  }

  function startHeartbeat() {
    const interval = Math.max(5, options.heartbeatSeconds()) * 1000
    heartbeatTimer = setInterval(() => {
      if (!ws || status !== 'open') return
      ws.send(JSON.stringify({ v: 1, type: 'ping', data: {} }))
      if (pongTimer === undefined) {
        pongTimer = setTimeout(() => {
          const socket = ws
          if (!socket) return
          drop(socket)
          closed(1006)
        }, PONG_TIMEOUT_MS)
      }
    }, interval)
  }

  function closed(code: number) {
    ws = null
    clearConnectionTimers()
    options.onDisconnect()
    if (!running) return
    if (code !== 4004 && code !== 4011) {
      lastRecoverCode = 0
      recoverAttempts = 0
    }

    switch (code) {
      case 4003:
        return fatal({
          code: 'connection_refused',
          message: 'The socket refused this publishable key or origin.'
        })
      case 4000:
        if (++protocolErrors > 1) {
          return fatal({
            code: 'protocol_error',
            message: 'The socket closed with a protocol error twice.'
          })
        }
        return schedule(backoffDelay(attempt++, platform.random))
      case 4004:
      case 4011: {
        recoverAttempts = lastRecoverCode === code ? recoverAttempts + 1 : 1
        lastRecoverCode = code
        const reason: RecoverReason = code === 4004 ? 'credentials_invalid' : 'access_expired'
        const myRun = run
        recovering = true
        setStatus('waiting')
        options.recover(reason, recoverAttempts).then(
          (ok) => {
            if (myRun !== run || !running) return
            recovering = false
            if (!ok)
              return fatal({
                code: 'session_lost',
                message: 'Socket credentials could not be recovered.'
              })
            // The first recovery reconnects at once; repeats back off so a bad token can't spin.
            schedule(recoverAttempts > 1 ? backoffDelay(attempt++, platform.random) : 0)
          },
          () => {
            if (myRun !== run || !running) return
            recovering = false
            schedule(backoffDelay(attempt++, platform.random))
          }
        )
        return
      }
      case 4029:
        return schedule(Math.max(RATE_LIMIT_DELAY_MS, backoffDelay(attempt++, platform.random)))
      case 4100:
        return schedule(Math.floor(platform.random() * RESTART_JITTER_MS))
      default:
        return schedule(backoffDelay(attempt++, platform.random))
    }
  }

  function schedule(delay: number) {
    clearTimeout(retryTimer)
    setStatus('waiting')
    if (platform.isHidden() && !options.hasPending()) {
      waitingForVisible = true
      return
    }
    retryTimer = setTimeout(connect, delay)
  }

  function fatal(error: WidgetError) {
    running = false
    clearTimeout(retryTimer)
    setStatus('stopped')
    options.onFatal(error)
  }

  function teardownSocket() {
    run++
    recovering = false
    clearTimeout(retryTimer)
    retryTimer = undefined
    clearConnectionTimers()
    if (ws) {
      const socket = ws
      ws = null
      drop(socket)
      options.onDisconnect()
    }
  }

  function wake() {
    if (running && !ws && !recovering && status === 'waiting') connect()
  }

  const transport: SocketTransport = {
    cursor: null,
    get status() {
      return status
    },
    start() {
      if (running) return
      running = true
      attempt = 0
      protocolErrors = 0
      unsubscribe = [
        platform.onVisibilityChange(() => {
          if (!platform.isHidden() && waitingForVisible) connect()
        }),
        platform.onOnline(() => {
          if (!ws) connect()
        })
      ]
      connect()
    },
    stop() {
      running = false
      waitingForVisible = false
      teardownSocket()
      for (const off of unsubscribe) off()
      unsubscribe = []
      setStatus('idle')
    },
    reconnect() {
      if (!running) return
      teardownSocket()
      connect()
    },
    send(frame) {
      if (!ws || status !== 'open') return false
      ws.send(JSON.stringify({ v: 1, ...frame }))
      return true
    },
    wake
  }
  return transport
}

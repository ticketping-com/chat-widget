/**
 * Exponential backoff with full jitter: a random delay in `[0, min(max, base * 2^attempt))`.
 * `attempt` starts at 0.
 */
export function backoffDelay(
  attempt: number,
  random: () => number,
  base: number = 500,
  max: number = 30_000
): number {
  const ceiling = Math.min(max, base * 2 ** Math.min(attempt, 30))
  return Math.floor(random() * ceiling)
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

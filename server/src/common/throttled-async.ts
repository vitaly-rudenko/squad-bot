/**
 * Throttle given callback with leading and trailing calls.
 *
 * 1. If not currently throttled, calls immediately and starts a timer.
 * 2. If currently throttled, ensures that *last* call is always scheduled.
 * 3. If currently throttled and *last* call is scheduled, its args are overridden.
 * 4. Each throttled call ensures that callback is called at least once (but not necessarily with its args).
 */
export function throttledAsync<A extends unknown[]>(
  callback: (...args: A) => Promise<void>,
  timeoutMs: number,
): (...args: A) => Promise<void> {
  let shouldThrottle = false
  let pendingCall: { args: A; promiseWithResolvers: PromiseWithResolvers<void> } | undefined

  function schedule() {
    setTimeout(async () => {
      if (pendingCall) {
        const call = pendingCall
        pendingCall = undefined

        try {
          await callback(...call.args)
          call.promiseWithResolvers.resolve()
        } catch (error: unknown) {
          call.promiseWithResolvers.reject(error)
        }

        schedule()
      } else {
        shouldThrottle = false
      }
    }, timeoutMs)
  }

  return async (...args: A) => {
    if (shouldThrottle) {
      if (pendingCall) {
        pendingCall.args = args
      } else {
        pendingCall = { args, promiseWithResolvers: Promise.withResolvers<void>() }
      }

      await pendingCall.promiseWithResolvers.promise
      return
    }

    shouldThrottle = true

    try {
      await callback(...args)
    } finally {
      schedule()
    }
  }
}

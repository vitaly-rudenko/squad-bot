/**
 * @param  {Middleware[]} middlewares
 * @template {(context: T, next: Function) => any} Middleware
 * @template {import('telegraf').Context} T
 */
export function wrap(...middlewares) {
  /** @param {T} context */
  return async (context, next) => {
    for (const middleware of middlewares) {
      let interrupt = true
      await middleware(context, async () => interrupt = false)
      if (interrupt) break
    }

    return next()
  }
}

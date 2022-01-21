/** @typedef {import('telegraf').Context} Context */

/** @param {import('./utils/UserSessionManager').UserSessionManager} userSessionManager */
export const withPhaseFactory = (userSessionManager) => {
  /**
   * @param {string | null} phase
   * @param {(context: T, next: Function) => any} middleware
   * @template {Context} T
   */
  return (phase, middleware) => {
      /** @param {T} context @param {Function} next */
      return async (context, next) => {
          const userId = context.state.userId ?? context.from.id

          if (userSessionManager.getPhase(userId) === phase) {
              await middleware(context, next)
          } else {
              await next()
          }
      }
  }
}

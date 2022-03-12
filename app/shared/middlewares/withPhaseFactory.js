/** @typedef {import('telegraf').Context} Context */

/** @param {import('../../users/UserSessionManager').UserSessionManager} userSessionManager */
export const withPhaseFactory = (userSessionManager) => {
  /**
   * @param {string | null} phase
   * @param {(context: T, next: Function) => any} middleware
   * @template {Context} T
   */
  return (phase, middleware) => {
    /** @param {T} context @param {Function} next */
    return async (context, next) => {
      const { userId } = context.state

      if (userSessionManager.getPhase(userId) === phase) {
        await middleware(context, next)
      } else {
        await next()
      }
    }
  }
}

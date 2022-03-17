/** @param {import('../../users/UserSessionManager').UserSessionManager} userSessionManager */
export const withPhaseFactory = (userSessionManager) => {
  /** @param {string | null} phase */
  return (phase) => {
    /** @param {import('telegraf').Context} context @param {Function} next */
    return async (context, next) => {
      const { userId } = context.state

      if (userSessionManager.getPhase(userId) === phase) {
        return next()
      }
    }
  }
}

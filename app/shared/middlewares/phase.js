export const withPhaseFactory = () => {
  /** @param {string | null} phase */
  return (phase) => {
    /** @param {import('telegraf').Context} context @param {Function} next */
    return async (context, next) => {
      const { userSession } = context.state

      if ((await userSession.getPhase()) === phase) {
        return next()
      }
    }
  }
}

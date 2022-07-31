export const withPhaseFactory = () => {
  /** @param {(string | null)[]} phases */
  return (...phases) => {
    if (phases.length === 0 || phases.some(phase => phase !== null && typeof phase !== 'string')) {
      throw new Error('Provided phases are invalid')
    }

    /** @param {import('telegraf').Context} context @param {Function} next */
    return async (context, next) => {
      const { userSession } = context.state

      if (phases.includes(await userSession.getPhase())) {
        return next()
      }
    }
  }
}

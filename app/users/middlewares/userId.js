export const withUserId = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    if (!context.from) return // ignore

    context.state.userId = String(context.from.id)
    return next()
  }
}

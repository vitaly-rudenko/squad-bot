export const withUserId = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    context.state.userId = String(context.from.id)
    return next()
  }
}

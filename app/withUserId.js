export const withUserId = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const userId = String(context.from.id)
    context.state.userId = userId
    await next()
  }
}

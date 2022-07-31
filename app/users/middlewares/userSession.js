export const withUserSession = ({ createUserSession }) => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { userId, chatId } = context.state
    if (!userId || !chatId) return // ignore

    context.state.userSession = createUserSession({ chatId, userId })
    return next()
  }
}
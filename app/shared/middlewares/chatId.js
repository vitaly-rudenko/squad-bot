export const withChatId = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    context.state.chatId = String(context.chat.id)
    return next()
  }
}

export const withChatId = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    context.state.chatId = context.chat ? String(context.chat.id) : undefined
    return next()
  }
}

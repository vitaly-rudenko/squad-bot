export const withGroupChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { localize } = context.state

    if (context.chat.type === 'group' || context.chat.type === 'supergroup') {
      return next()
    }

    await context.reply(localize('groupChatOnly'), { parse_mode: 'MarkdownV2' })
  }
}

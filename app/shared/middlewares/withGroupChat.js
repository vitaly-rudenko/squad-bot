export const withGroupChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    if (context.chat.type !== 'group' && context.chat.type !== 'supergroup') {
      await context.reply(
        context.state.localize('groupChatOnly'),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await next()
  }
}

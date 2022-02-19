export const withPrivateChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    if (context.chat.type !== 'private') {
      await context.reply(
        context.state.localize('privateChatOnly'),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await next()
  }
}

export const requirePrivateChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { localize } = context.state

    if (context.chat.type === 'private') {
      return next()
    }

    await context.reply(localize('privateChatOnly'), { parse_mode: 'MarkdownV2' })
  }
}

export const withPrivateChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    if (context.chat.type === 'private') {
      return next()
    }
  }
}

const GROUP_CHAT_TYPES = ['group', 'supergroup']

export const requireGroupChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { localize } = context.state

    if (GROUP_CHAT_TYPES.includes(context.chat.type)) {
      return next()
    }

    await context.reply(localize('groupChatOnly'), { parse_mode: 'MarkdownV2' })
  }
}

export const withGroupChat = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    if (GROUP_CHAT_TYPES.includes(context.chat.type)) {
      return next()
    }
  }
}

import { registry } from '../../registry.js'

export const GROUP_CHAT_TYPES = ['group', 'supergroup']

export const requireGroupChat = () => {
  const { localize } = registry.export()

  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { locale } = context.state

    if (GROUP_CHAT_TYPES.includes(context.chat.type)) {
      return next()
    }

    await context.reply(localize(locale, 'groupChatOnly'), { parse_mode: 'MarkdownV2' })
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

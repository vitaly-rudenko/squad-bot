import { registry } from '../../registry.js'

export const requirePrivateChat = () => {
  const { localize } = registry.export()

  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { locale } = context.state

    if (context.chat.type === 'private') {
      return next()
    }

    await context.reply(localize(locale, 'privateChatOnly'), { parse_mode: 'MarkdownV2' })
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

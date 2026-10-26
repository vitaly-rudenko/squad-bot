import { isGroupChat } from '../common/telegram.js'
import { registry } from '../registry.js'

export function createCountdownsFlow() {
  const { countdownsStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const countdown = async context => {
    const { chatId, locale } = context.state

    const isGroup = isGroupChat(context)

    await context.reply(localize(locale, 'countdowns.command.help'), { parse_mode: 'MarkdownV2' })
  }

  return {
    countdown,
  }
}

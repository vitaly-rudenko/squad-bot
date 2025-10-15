import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'

export function createCardsFlow() {
  const { localize, generateWebAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const cards = async (context) => {
    const { locale } = context.state

    const viewUrl = generateWebAppUrl('cards')

    await context.reply(
      localize(locale, 'cards.command.message', {
        viewUrl: escapeMd(viewUrl),
      }),
      {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      }
    )
  }

  return { cards }
}

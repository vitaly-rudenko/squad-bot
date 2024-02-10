import { registry } from '../../registry.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function createCardsFlow() {
  const { generateWebAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const cards = async (context) => {
    const { localize } = context.state

    const viewUrl = generateWebAppUrl('cards')
    const createUrl = generateWebAppUrl('new-card')

    await context.reply(
      localize(
        'command.cards.help',
        {
          viewUrl: escapeMd(viewUrl),
          createUrl: escapeMd(createUrl),
        }
      ),
      {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }
    )
  }

  return { cards }
}

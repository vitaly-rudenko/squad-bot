import { escapeMd } from '../../utils/escapeMd.js'

export function receiptsCommand({ generateWebAppUrl }) {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    const { localize } = context.state

    const viewUrl = generateWebAppUrl('receipts')
    const createUrl = generateWebAppUrl('new-receipt')

    await context.reply(
      localize(
        'command.receipts.help',
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
}

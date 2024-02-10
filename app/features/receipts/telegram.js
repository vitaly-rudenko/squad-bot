import { registry } from '../../registry.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function createReceiptsFlow() {
  const { generateWebAppUrl, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const receipts = async (context) => {
    const { locale } = context.state

    const viewUrl = generateWebAppUrl('receipts')
    const createUrl = generateWebAppUrl('new-receipt')

    await context.reply(
      localize(locale, 'receipts.command.message', {
        viewUrl: escapeMd(viewUrl),
        createUrl: escapeMd(createUrl),
      }),
      {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }
    )
  }

  return { receipts }
}

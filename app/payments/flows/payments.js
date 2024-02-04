import { escapeMd } from '../../utils/escapeMd.js'

export function paymentsCommand({ generateWebAppUrl }) {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    const { localize } = context.state

    const viewUrl = generateWebAppUrl('payments')
    const createUrl = generateWebAppUrl('payment', 'new')

    await context.reply(
      localize(
        'command.payments.help',
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

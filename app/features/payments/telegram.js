import { registry } from '../../registry.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function createPaymentsFlow() {
  const { generateWebAppUrl, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const payments = async (context) => {
    const { locale } = context.state

    const viewUrl = generateWebAppUrl('payments')
    const createUrl = generateWebAppUrl('new-payment')

    await context.reply(
      localize(
        locale,
        'payments.command.message',
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

  return {
    payments
  }
}

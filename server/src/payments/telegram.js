import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'

export function createPaymentsFlow() {
  const { localize, generateWebAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const payments = async (context) => {
    const { locale } = context.state

    const viewUrl = generateWebAppUrl('payments')

    await context.reply(
      localize(
        locale,
        'payments.command.message',
        {
          viewUrl: escapeMd(viewUrl),
        }
      ),
      {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      }
    )
  }

  return {
    payments
  }
}

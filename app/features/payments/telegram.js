import { escapeMd } from '../../utils/escapeMd.js'

/**
 * @param {{
 *   generateWebAppUrl: import('../../utils/types').GenerateWebAppUrl
 * }} input
 */
export function createPaymentsFlow({ generateWebAppUrl }) {
  /** @param {import('telegraf').Context} context */
  const payments = async (context) => {
    const { localize } = context.state

    const viewUrl = generateWebAppUrl('payments')
    const createUrl = generateWebAppUrl('new-payment')

    await context.reply(
      localize(
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

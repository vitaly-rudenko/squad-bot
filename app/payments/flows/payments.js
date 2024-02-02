import { escapeMd } from '../../utils/escapeMd.js'

export function paymentsCommand({ usersStorage, generateWebAppUrl }) {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    const { userId, localize } = context.state

    const user = await usersStorage.findById(userId)
    const webAppUrl = generateWebAppUrl({ command: 'payments' })

    await context.reply(
      localize(
        'command.payments.help',
        {
          name: escapeMd(user.name),
          webAppUrl: escapeMd(webAppUrl),
        }
      ),
      {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }
    )
  }
}

import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function paymentsGetCommand({ usersStorage, bot }) {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    bot.botInfo ??= await bot.telegram.getMe()

    const { userId, localize } = context.state
    const isPrivateChat = context.chat?.type === 'private'

    const token = generateTemporaryAuthToken(userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.WEB_APP_URL}/paymentview${queryString}`
    const viewUrl = `${process.env.WEB_APP_URL}/paymentslist${queryString}`
    const openInWebApp = `https://t.me/${bot.botInfo.username}/${process.env.WEB_APP_NAME}?startapp=payments`

    const user = await usersStorage.findById(userId)

    await context.reply(
      localize(
        isPrivateChat
          ? 'command.payments.chooseAction'
          : 'command.payments.chooseActionWithoutToken',
        { name: escapeMd(user.name) }
      ),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(localize('command.payments.actions.add'), addUrl),
          Markup.button.url(localize('command.payments.actions.view'), viewUrl),
          Markup.button.url(localize('command.payments.actions.openInWebApp'), openInWebApp),
        ], { columns: 1 }).reply_markup
      }
    )
  }
}

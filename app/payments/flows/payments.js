import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function paymentsGetCommand({ usersStorage }) {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    const { userId, localize } = context.state
    const isPrivateChat = context.chat.type === 'private'

    const token = generateTemporaryAuthToken(userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.DOMAIN}/paymentview${queryString}`
    const viewUrl = `${process.env.DOMAIN}/paymentslist${queryString}`

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
        ], { columns: 1 }).reply_markup
      }
    )
  }
}

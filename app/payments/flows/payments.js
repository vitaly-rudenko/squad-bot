import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'

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

    const message = await context.reply(
      localize(
        isPrivateChat
          ? 'command.payments.chooseAction'
          : 'command.payments.chooseActionWithoutToken',
        { name: user.name }
      ),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(localize('command.payments.actions.add'), addUrl),
          Markup.button.url(localize('command.payments.actions.view'), viewUrl),
        ], { columns: 1 }).reply_markup
      }
    )

    if (context.chat.type !== 'private') {
      setTimeout(async () => {
        await Promise.all([
          context.deleteMessage(context.message.message_id).catch(() => {}),
          context.deleteMessage(message.message_id).catch(() => {}),
        ])
      }, 60_000)
    }
  }
}

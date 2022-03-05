import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'

export function paymentsGetCommand() {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    const isPrivateChat = context.chat.type === 'private'

    const token = generateTemporaryAuthToken(context.state.userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.DOMAIN}/paymentview${queryString}`
    const viewUrl = `${process.env.DOMAIN}/paymentslist${queryString}`

    const message = await context.reply(
      context.state.localize(
        isPrivateChat
          ? 'command.payments.chooseAction'
          : 'command.payments.chooseActionWithoutToken',
        { name: context.state.user.name }
      ),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(context.state.localize('command.payments.actions.add'), addUrl),
          Markup.button.url(context.state.localize('command.payments.actions.view'), viewUrl),
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

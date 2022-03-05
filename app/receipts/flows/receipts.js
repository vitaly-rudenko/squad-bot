import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'

export function receiptsGetCommand() {
  return async (context) => {
    const isPrivateChat = context.chat.type === 'private'

    const token = generateTemporaryAuthToken(context.state.userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.DOMAIN}/${queryString}`
    const viewUrl = `${process.env.DOMAIN}/receiptslist${queryString}`

    const message = await context.reply(
      context.state.localize(
        isPrivateChat
          ? 'command.receipts.chooseAction'
          : 'command.receipts.chooseActionWithoutToken',
        { name: context.state.user.name }
      ),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(context.state.localize('command.receipts.actions.add'), addUrl),
          Markup.button.url(context.state.localize('command.receipts.actions.view'), viewUrl),
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

import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'

export function receiptsGetCommand({ usersStorage }) {
  return async (context) => {
    const { userId, localize } = context.state
    const isPrivateChat = context.chat.type === 'private'

    const token = generateTemporaryAuthToken(userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.DOMAIN}/${queryString}`
    const viewUrl = `${process.env.DOMAIN}/receiptslist${queryString}`

    const user = await usersStorage.findById(userId)

    const message = await context.reply(
      localize(
        isPrivateChat
          ? 'command.receipts.chooseAction'
          : 'command.receipts.chooseActionWithoutToken',
        { name: user.name }
      ),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(localize('command.receipts.actions.add'), addUrl),
          Markup.button.url(localize('command.receipts.actions.view'), viewUrl),
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

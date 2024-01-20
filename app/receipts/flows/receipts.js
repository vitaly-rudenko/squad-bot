import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function receiptsGetCommand({ usersStorage }) {
  return async (context) => {
    const { userId, localize } = context.state
    const isPrivateChat = context.chat.type === 'private'

    const token = generateTemporaryAuthToken(userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.WEB_APP_URL}/${queryString}`
    const viewUrl = `${process.env.WEB_APP_URL}/receiptslist${queryString}`

    const user = await usersStorage.findById(userId)

    await context.reply(
      localize(
        isPrivateChat
          ? 'command.receipts.chooseAction'
          : 'command.receipts.chooseActionWithoutToken',
        { name: escapeMd(user.name) }
      ),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(localize('command.receipts.actions.add'), addUrl),
          Markup.button.url(localize('command.receipts.actions.view'), viewUrl),
        ], { columns: 1 }).reply_markup
      }
    )
  }
}

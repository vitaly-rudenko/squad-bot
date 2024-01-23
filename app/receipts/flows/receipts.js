import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../../auth/generateTemporaryAuthToken.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function receiptsGetCommand({ usersStorage, bot }) {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    bot.botInfo ??= await bot.telegram.getMe()

    const { userId, localize } = context.state
    const isPrivateChat = context.chat?.type === 'private'

    const token = generateTemporaryAuthToken(userId)

    const queryString = isPrivateChat ? `?token=${token}`: ''
    const addUrl = `${process.env.WEB_APP_URL}/${queryString}`
    const viewUrl = `${process.env.WEB_APP_URL}/receiptslist${queryString}`
    const openInWebApp = `https://t.me/${bot.botInfo.username}/${process.env.WEB_APP_NAME}?startapp=receipts`

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
          Markup.button.url(localize('command.receipts.actions.openInWebApp'), openInWebApp),
        ], { columns: 1 }).reply_markup
      }
    )
  }
}

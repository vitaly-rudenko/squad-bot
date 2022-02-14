import { Markup } from 'telegraf'
import { generateTemporaryAuthToken } from '../generateTemporaryAuthToken.js'

export function paymentsGetCommand() {
  /** @param {import('telegraf').Context} context */
  return async (context) => {
    const token = generateTemporaryAuthToken(context.state.userId)

    const addUrl = `${process.env.DOMAIN}/paymentview?token=${token}`
    const viewUrl = `${process.env.DOMAIN}/paymentslist?token=${token}`

    const message = await context.reply(`
🧾 ${context.state.user.name}, выбери операцию:
    `, {
      reply_markup: Markup.inlineKeyboard([
        Markup.button.url('✏️ Добавить платеж', addUrl),
        Markup.button.url('👀 Просмотреть платежи', viewUrl),
      ], { columns: 1 }).reply_markup
    })

    setTimeout(async () => {
      await Promise.all([
        context.deleteMessage(context.message.message_id).catch(() => {}),
        context.deleteMessage(message.message_id).catch(() => {}),
      ])
    }, 60_000)
  }
}

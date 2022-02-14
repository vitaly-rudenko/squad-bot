import { generateTemporaryAuthToken } from '../generateTemporaryAuthToken.js'

export function paymentsGetCommand() {
  return async (context) => {
    const token = generateTemporaryAuthToken(context.state.user)

    await context.reply(`
✏️ Добавить платеж можно здесь:
${process.env.DOMAIN}/paymentview?token=${token}

👀 Посмотреть платежи можно здесь:
${process.env.DOMAIN}/paymentslist?token=${token}
`)
  }
}

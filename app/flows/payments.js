import { generateTemporaryAuthToken } from '../generateTemporaryAuthToken.js'

export function paymentsGetCommand() {
  return async (context) => {
    const userId = context.state.userId
    const token = generateTemporaryAuthToken(userId)

    await context.reply(`
Добавить платеж можно здесь:
https://groupsquadbot.herokuapp.com/paymentview?token=${token}

Посмотреть платежи можно здесь:
https://groupsquadbot.herokuapp.com/paymentslist?token=${token}
`)
  }
}

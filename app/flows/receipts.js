import { generateTemporaryAuthToken } from '../generateTemporaryAuthToken.js'

export function receiptsGetCommand() {
  return async (context) => {
    const userId = context.state.userId
    const token = generateTemporaryAuthToken(userId)

    await context.reply(`
Добавить чек можно здесь:
https://groupsquadbot.herokuapp.com/?token=${token}

Посмотреть чеки можно здесь:
https://groupsquadbot.herokuapp.com/receiptslist?token=${token}
`)
  }
}

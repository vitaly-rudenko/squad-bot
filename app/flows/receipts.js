import { generateTemporaryAuthToken } from '../generateTemporaryAuthToken.js'

export function receiptsGetCommand() {
  return async (context) => {
    const token = generateTemporaryAuthToken(context.state.userId)

    await context.reply(`
✏️ Добавить чек можно здесь:
${process.env.DOMAIN}/?token=${token}

👀 Посмотреть чеки можно здесь:
${process.env.DOMAIN}/receiptslist?token=${token}
`)
  }
}

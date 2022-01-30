export function startCommand({ storage }) {
  return async (context) => {
    if (context.chat.type !== 'private') {
      await context.reply('Эту команду можно выполнить только в ЛС бота.')
      return
    }

    const userId = context.state.userId
    const { first_name: name, username } = context.from

    try {
      await storage.createUser({
        id: userId,
        name,
        username: username || null,
      })

      await context.reply('Ты успешно зарегистрировался! 🎉')
    } catch (error) {
      await context.reply('Ты уже зарегистрирован, твои данные были обновлены 🙌')
    }

    await storage.makeUserComplete(userId)
  }
}

export function registerCommand({ storage }) {
  return async (context) => {
    if (context.chat.type === 'private') {
      await context.reply('Эту команду можно выполнить только в чате. Используй /start')
      return
    }

    const userId = context.state.userId
    const { first_name: name, username } = context.from

    try {
      await storage.createUser({
        id: userId,
        name,
        username: username || null,
      })

      await context.reply(`
Ты успешно зарегистрировался! 🎉
Чтобы получать уведомления, отправь боту /start в ЛС.
      `)
    } catch (error) {
      await context.reply(`
Ты уже зарегистрирован, твои данные были обновлены 🙌
Чтобы получать уведомления, отправь боту /start в ЛС.
`)
    }
  }
}

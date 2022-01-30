export function startCommand({ storage }) {
  return async (context) => {
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

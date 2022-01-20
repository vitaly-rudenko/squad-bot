export function startCommand({ storage }) {
  return async (context) => {
    const { first_name: name, username } = context.from

    try {
      await storage.createUser({
        id: context.state.userId,
        name,
        username: username || null,
      })

      await context.reply('Зарегистрирован! 🎉')
    } catch (error) {
      await context.reply('Ты уже зарегистрирован ❌')
    }
  }
}

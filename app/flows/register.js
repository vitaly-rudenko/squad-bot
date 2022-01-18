export function registerCommand({ storage }) {
  return async (context) => {
    const { id, first_name: name, username } = context.from

    try {
      await storage.createUser({
        id: String(id),
        name,
        username: username || null,
      })

      await context.reply('Registered! 🎉')
    } catch (error) {
      await context.reply('Already registered ❌')
    }
  }
}

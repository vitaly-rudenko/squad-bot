export function usersCommand({ storage }) {
  return async (context) => {
    const users = await storage.findUsers()

    await context.reply(`
👥 Пользователи:
${
  users
    .map(user => `- ${user.name} (ник: ${user.username}, id: ${user.id}${user.isComplete ? '' : ', без уведомлений'})`)
    .join('\n') || '- Никто не зарегистрирован :('
}
    `)
  }
}
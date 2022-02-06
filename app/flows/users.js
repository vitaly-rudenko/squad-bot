import escapeHtml from 'escape-html'

export function usersCommand({ storage }) {
  return async (context) => {
    const users = await storage.findUsers()

    await context.reply(`
👥 Пользователи:
${
  users
    .map(user => `- <a href="tg://user?id=${user.id}">${escapeHtml(user.name)}</a> (ник: ${user.username}, id: ${user.id}${user.isComplete ? '' : ', без уведомлений'})`)
    .join('\n') || '- Никто не зарегистрирован :('
}
    `, { parse_mode: 'html' })
  }
}
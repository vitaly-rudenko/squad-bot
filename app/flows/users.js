import { stripIndent } from 'common-tags'

export function usersCommand({ storage }) {
  return async (context) => {
    const users = await storage.findUsers()

    await context.reply(`
Архивчане:
${
  users
    .map(user => `- ${user.name} (username: ${user.username}, id: ${user.id})`)
    .join('\n') || '- Никто не зарегистрирован :('
}
    `)
  }
}
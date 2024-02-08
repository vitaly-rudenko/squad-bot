/**
 * @param {{
 *   usersStorage: import('./storage.js').UsersPostgresStorage
 * }} input
 */
export function useUsersFlow({ usersStorage }) {
  /** @param {import('telegraf').Context} context */
  const start = async (context) => {
    if (!context.from) return

    const { localize } = context.state

    await usersStorage.store({
      id: String(context.from.id),
      name: context.from.first_name,
      ...context.from.username && { username: context.from.username },
    })

    await context.reply(
      localize('users.command.start.message', { parse_mode: 'MarkdownV2' })
    )
  }

  return { start }
}

export const withUserId = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    if (!context.from) return // ignore

    context.state.userId = String(context.from.id)
    return next()
  }
}

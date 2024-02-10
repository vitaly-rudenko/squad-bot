import { registry } from '../registry.js'

export function useUsersFlow() {
  const { usersStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const start = async (context) => {
    if (!context.from) return

    const { locale } = context.state

    await usersStorage.store({
      id: String(context.from.id),
      name: context.from.first_name,
      ...context.from.username && { username: context.from.username },
      locale,
    })

    await context.reply(
      localize(locale, 'users.command.start.message'),
      { parse_mode: 'MarkdownV2' }
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

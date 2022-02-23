/** @typedef {import('telegraf').Context} Context */

/** @param {import('../UsersPostgresStorage').UsersPostgresStorage} usersStorage */
export const withUserFactory = (usersStorage) => {
  /** @template {Context} T */
  return ({ ignore = false } = {}) => {
    /** @param {T} context @param {Function} next */
    return async (context, next) => {
      const userId = context.state.userId ?? context.from.id

      const user = await usersStorage.findById(userId)
      if (!user) {
        if (!ignore) {
          await context.reply(
            context.state.localize('unregistered'),
            { parse_mode: 'MarkdownV2' }
          )
        }
        return
      }

      context.state.user = user

      await next()
    }
  }
}

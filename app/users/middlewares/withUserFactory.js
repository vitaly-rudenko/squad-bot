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
          await context.reply(`
Сначала нужно зарегистрироваться ❌
Выполни команду /register здесь в чате.
Или выполни команду /start в ЛС бота чтобы получать уведомления о платежах и чеках.
          `)
        }
        return
      }

      context.state.user = user

      await next()
    }
  }
}

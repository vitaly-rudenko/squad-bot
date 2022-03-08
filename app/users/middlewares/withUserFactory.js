/** @typedef {import('telegraf').Context} Context */

/** @param {import('../UsersPostgresStorage').UsersPostgresStorage} usersStorage */
export const withUserFactory = (usersStorage) => {
  /** @template {Context} T */
  return () => {
    /** @param {T} context @param {Function} next */
    return async (context, next) => {
      if (!context.state.user) {
        const userId = context.state.userId ?? context.from.id
        context.state.user = await usersStorage.findById(userId)

        if (!context.state.user) {
          throw new Error(`User not found: ${userId}`)
        }
      }

      return next()
    }
  }
}

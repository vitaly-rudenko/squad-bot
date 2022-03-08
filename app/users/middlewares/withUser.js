import { User } from '../User.js'

/** @param {import('../UsersPostgresStorage').UsersPostgresStorage} usersStorage */
export const withUser = (usersStorage) => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { id, first_name: name, username } = context.from
    const userId = String(id)

    try {
      await usersStorage.create(
        new User({
          id: userId,
          name,
          username: username || null,
          isComplete: context.chat.type === 'private',
        })
      )
    } catch (error) {
      if (error.code !== 'ALREADY_EXISTS') {
        throw error
      }
    }

    context.state.user = await usersStorage.findById(userId)
    context.state.userId = userId

    return next()
  }
}

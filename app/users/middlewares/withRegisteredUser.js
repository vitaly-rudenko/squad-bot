import { User } from '../User.js'

export const withRegisteredUser = ({ userManager, usersStorage, logger }) => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { userId } = context.state
    const { first_name: name, username } = context.from

    if (await userManager.isRegistered(userId)) {
      return next()
    }

    try {
      await usersStorage.create(
        new User({
          id: userId,
          name,
          username: username || null,
          isComplete: context.chat.type === 'private',
        })
      )

      userManager.clearCache(userId)

      logger.info(`User has been registered: ${name} (${userId}, @${username})`)
    } catch (error) {
      if (error.code !== 'ALREADY_EXISTS') {
        throw error
      }
    }

    return next()
  }
}

import { User } from '../User.js'

export const withRegisteredUser = ({ userManager, usersStorage }) => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const { userId } = context.state
    const { first_name: name, username } = context.from

    const isPrivateChat = context.chat.type === 'private'
    const existingUser = await userManager.getCachedUser(userId)

    const user = new User({
      id: userId,
      name,
      username: username || null,
      isComplete: isPrivateChat,
    })

    if (existingUser) {
      if (!existingUser.isComplete && isPrivateChat) {
        await usersStorage.update(user)
        userManager.clearCache(userId)

        console.log(`User is now complete: ${name} (${userId}, @${username})`)
      }

      return next()
    }

    try {
      await usersStorage.create(user)
      userManager.clearCache(userId)

      console.log(`User has been registered: ${name} (${userId}, @${username}, complete: ${isPrivateChat})`)
    } catch (error) {
      if (error.code !== 'ALREADY_EXISTS') {
        throw error
      }
    }

    return next()
  }
}

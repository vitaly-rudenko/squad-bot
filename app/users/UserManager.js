import { logger } from '../../logger.js'

export class UserManager {
  constructor({ userCache, usersStorage }) {
    this._usersStorage = usersStorage
    this._userCache = userCache
  }

  /** @param {import('./User').User} user */
  async softRegister(user) {
    const existingUser = await this.getCachedUser(user.id)

    if (!existingUser) {
      try {
        await this._usersStorage.create(user)
        await this.clearCache(user.id)

        logger.debug({ user }, `User has been registered`)
      } catch (error) {
        if (error.code !== 'ALREADY_EXISTS') {
          throw error
        }
      }
    }
  }

  /** @param {import('./User').User} user */
  async hardRegister(user) {
    let isNew = false

    try {
      await this._usersStorage.create(user)
      isNew = true
    } catch (error) {
      if (error.code === 'ALREADY_EXISTS') {
        await this._usersStorage.update(user)
      } else {
        throw error
      }
    }

    await this.clearCache(user.id)
    return isNew
  }

  async clearCache(userId) {
    await this._userCache.delete(userId)
  }

  async getCachedUser(userId) {
    const cachedUser = await this._userCache.get(userId)
    if (cachedUser) {
      return cachedUser
    }

    const user = await this._usersStorage.findById(userId)
    if (user) {
      await this._userCache.cache(user)
    }

    return user
  }
}

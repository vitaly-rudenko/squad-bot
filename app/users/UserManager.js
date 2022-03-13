export class UserManager {
  constructor({ userCache, usersStorage }) {
    this._usersStorage = usersStorage
    this._userCache = userCache
  }

  clearCache(userId) {
    this._userCache.delete(userId)
  }

  async getCachedUser(userId) {
    const cachedUser = await this._userCache.get(userId)
    if (cachedUser) {
      return cachedUser
    }

    const user = await this._usersStorage.findById(userId)
    if (user) {
      this._userCache.cache(user)
    }

    return user
  }
}

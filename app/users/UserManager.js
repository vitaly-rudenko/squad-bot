import { Cache } from '../utils/Cache.js'

export class UserManager {
  constructor({ usersStorage }) {
    this._usersStorage = usersStorage
    this._userCache = new Cache(60 * 60_000)
  }

  clearCache(userId) {
    this._userCache.delete(userId)
  }

  async getCachedUser(userId) {
    if (this._userCache.has(userId)) {
      return this._userCache.get(userId)
    }

    const user = await this._usersStorage.findById(userId)
    if (user) {
      this._userCache.set(userId, user)
    }

    return user
  }
}

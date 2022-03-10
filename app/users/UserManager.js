import { Cache } from '../utils/Cache'

export class UserManager {
  constructor({ defaultLocale, usersStorage }) {
    this._defaultLocale = defaultLocale
    this._usersStorage = usersStorage
    this._userCache = new Cache(60 * 60_000)
  }

  clearCache(userId) {
    this._userCache.delete(userId)
  }

  async isRegistered(userId) {
    return Boolean(await this._getCachedUser(userId))
  }

  async getCachedLocale(userId) {
    return (await this._getCachedUser(userId))?.locale ?? this._defaultLocale
  }

  async _getCachedUser(userId) {
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

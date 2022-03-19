import { InMemoryCache } from '../utils/InMemoryCache.js'

export class UserInMemoryCache {
  constructor() {
    this._cache = new InMemoryCache(60 * 60_000)
  }

  async cache(user) {
    return await this._cache.set(user.id, user)
  }

  async get(userId) {
    return await this._cache.get(userId)
  }

  async delete(userId) {
    await this._cache.delete(userId)
  }
}

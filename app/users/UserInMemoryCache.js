import { Cache } from '../utils/Cache.js'

export class UserInMemoryCache {
  constructor() {
    this._cache = new Cache(60 * 60_000)
  }

  async cache(user) {
    this._cache.set(user.id, user)
  }

  async get(userId) {
    return this._cache.get(userId)
  }

  async delete(userId) {
    this._cache.delete(userId)
  }
}

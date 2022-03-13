import { Cache } from '../utils/Cache.js'

export class UserInMemoryCache {
  constructor() {
    this._cache = new Cache(60 * 60_000)
  }

  cache(user) {
    this._cache.set(user.id, user)
  }

  get(userId) {
    return this._cache.get(userId)
  }

  has(userId) {
    return this._cache.has(userId)
  }

  delete(userId) {
    this._cache.delete(userId)
  }
}

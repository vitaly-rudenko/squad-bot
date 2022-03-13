import { Cache } from '../utils/Cache.js'

export class MembershipInMemoryCache {
  constructor() {
    this._cache = new Cache(60 * 60_000)
  }

  cache(userId, chatId) {
    const hasBeenLinked = this._cache.has(`${userId}_${chatId}`)
    this._cache.set(`${userId}_${chatId}`)
    return !hasBeenLinked
  }

  delete(userId, chatId) {
    this._cache.delete(`${userId}_${chatId}`)
  }
}

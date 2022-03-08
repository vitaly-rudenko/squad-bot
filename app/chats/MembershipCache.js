import { Cache } from '../utils/Cache.js'

export class MembershipCache {
  constructor() {
    this._cache = new Cache(60 * 60_000)
  }

  store(userId, chatId) {
    const hasBeenLinked = this._cache.has(`${userId}_${chatId}`)
    this._cache.set(`${userId}_${chatId}`)
    return !hasBeenLinked
  }

  deleteById(userId, chatId) {
    this._cache.delete(`${userId}_${chatId}`)
  }
}

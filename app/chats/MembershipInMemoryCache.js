import { InMemoryCache } from '../utils/InMemoryCache.js'

export class MembershipInMemoryCache {
  constructor() {
    this._cache = new InMemoryCache(60 * 60_000)
  }

  async cache(userId, chatId) {
    return await this._cache.set(`${userId}_${chatId}`)
  }

  async delete(userId, chatId) {
    await this._cache.delete(`${userId}_${chatId}`)
  }
}

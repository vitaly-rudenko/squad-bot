export class MembershipCache {
  constructor(cache) {
    this._cache = cache
  }

  async cache(userId, chatId) {
    return await this._cache.set(`${userId}_${chatId}`)
  }

  async delete(userId, chatId) {
    await this._cache.delete(`${userId}_${chatId}`)
  }
}

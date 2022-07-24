export class MembershipCache {
  constructor(cache) {
    this._cache = cache
  }

  async cache(userId, groupId) {
    return await this._cache.set(`${userId}_${groupId}`)
  }

  async delete(userId, groupId) {
    await this._cache.delete(`${userId}_${groupId}`)
  }
}

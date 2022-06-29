export class UserCache {
  constructor(cache) {
    this._cache = cache
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

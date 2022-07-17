export class GroupManager {
  constructor(storage, cache) {
    this._storage = storage
    this._cache = cache
  }

  async store(group) {
    if (!(await this._cache.has(group.id))) {
      await this._storage.store(group)
      await this._cache.set(group.id)
    }
  }
}

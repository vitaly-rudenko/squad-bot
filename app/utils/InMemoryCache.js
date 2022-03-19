export class InMemoryCache {
  constructor(ttlMs) {
    this._ttlMs = ttlMs
    this._data = new Map()

    setInterval(() => {
      const entries = [...this._data.entries()]

      for (let i = entries.length - 1; i >= 0; i--) {
        const [key, [updatedAt]] = entries[i]

        if (Date.now() - updatedAt >= ttlMs) {
          this._data.delete(key)
        }
      }
    }, ttlMs)
  }

  /** @param {any} value */
  async set(key, value = true) {
    const isNew = !this._data.has(key)
    this._data.set(key, [Date.now(), value])
    return isNew
  }

  async get(key) {
    return this._data.get(key)?.[1]
  }

  async has(key) {
    return this._data.has(key)
  }

  async delete(key) {
    this._data.delete(key)
  }
}

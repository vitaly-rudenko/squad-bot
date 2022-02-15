export class Cache {
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

  set(key, value = true) {
    this._data.set(key, [Date.now(), value])
  }

  get(key) {
    if (!this._data.has(key)) {
      return undefined
    }

    return this._data.get(key)[1]
  }

  has(key) {
    return this._data.has(key)
  }

  delete(key) {
    this._data.delete(key)
  }
}

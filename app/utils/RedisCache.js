export class RedisCache {
  /** @param {import('ioredis').default} redis */
  constructor(redis, prefix, ttlMs) {
    this._redis = redis
    this._prefix = prefix
    this._ttlMs = ttlMs
  }

  /** @param {any} value */
  async set(key, value = true) {
    const result = await this._redis
      .multi()
      .exists(this._key(key))
      .set(this._key(key), JSON.stringify(value))
      .pexpire(this._key(key), this._ttlMs)
      .exec()

    return result[0][1] === 0
  }

  async get(key) {
    const result = await this._redis.get(this._key(key))
    return result ? JSON.parse(result) : undefined
  }

  async has(key) {
    return await this._redis.exists(this._key(key)) === 1
  }

  async delete(key) {
    await this._redis.del(this._key(key))
  }

  _key(key) {
    return `${this._prefix}:${key}`
  }
}
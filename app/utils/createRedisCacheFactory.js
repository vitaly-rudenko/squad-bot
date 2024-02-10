import { RedisCache } from './RedisCache.js'

/** @param {import('ioredis').Redis} redis */
export function createRedisCacheFactory(redis) {
  /**
   * @param {string} prefix
   * @param {number} ttlMs
   */
  return (prefix, ttlMs) => new RedisCache(redis, prefix, ttlMs)
}

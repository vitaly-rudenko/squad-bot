import { RedisCache } from './RedisCache.js'

export function createRedisCacheFactory(redis) {
  return (prefix, ttlMs) => new RedisCache(redis, prefix, ttlMs)
}

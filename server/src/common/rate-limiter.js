import { RateLimiterRedis } from 'rate-limiter-flexible'
import { registry } from '../registry.js'
import { ApiError } from './errors.js'

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

/**
 * @param {{
 *   keyPrefix: string
 *   points: number
 *   durationMs: number
 *   calculatePoints?: (userId: string) => Promise<number>
 * }} input
 */
export function createRateLimiterMiddleware({
  keyPrefix,
  points,
  durationMs,
  calculatePoints,
}, { redis } = registry.export()) {
  const rateLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `rate-limit:${keyPrefix}:`,
    points,
    duration: Math.trunc(durationMs / 1000),
  })

  /** @type {import('express-serve-static-core').RequestHandler} */
  return async (req, _, next) => {
    const userId = req.user.id
    const points = calculatePoints ? await calculatePoints(userId) : 1

    try {
      await rateLimiter.consume(userId, points)
    } catch (error) {
      throw new ApiError({
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
      })
    }

    next()
  }
}

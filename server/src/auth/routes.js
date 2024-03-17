import crypto from 'crypto'
import Router from 'express-promise-router'
import jwt from 'jsonwebtoken'
import { literal, nonempty, number, object, optional, string, type, union } from 'superstruct'
import { userIdSchema } from '../common/schemas.js'
import { NotAuthenticatedError, NotFoundError } from '../common/errors.js'
import { ApiError } from '../common/errors.js'
import { registry } from '../registry.js'
import { createRedisCache } from '../common/cache.js'
import { env } from '../env.js'

export const temporaryAuthTokenSchema = nonempty(string())
export const temporaryAuthTokenPayloadSchema = type({ userId: userIdSchema })
export const authenticateWebAppSchema = object({ initData: string() })
export const initDataUserSchema = type({ id: number() })
export const authTokenSchema = type({
  user: type({
    id: userIdSchema,
    name: string(),
    username: optional(string()),
    locale: union([literal('uk'), literal('en')]),
  })
})

export function createAuthRouter() {
  const { usersStorage } = registry.export()

  const router = Router()

  const codeCache = createRedisCache('codes', env.USE_TEST_MODE ? 60_000 : 5 * 60_000)

  router.get('/authenticate', async (req, res) => {
    const code = temporaryAuthTokenSchema.create(req.query['code'])
    if (!(await codeCache.set(code))) {
      throw new ApiError({
        code: 'INVALID_CODE',
        status: 400,
      })
    }

    let userId
    try {
      ({ userId } = temporaryAuthTokenPayloadSchema
        .create(jwt.verify(code, env.TOKEN_SECRET)))
    } catch (err) {
      throw new ApiError({
        code: 'INVALID_CODE',
        status: 400,
      })
    }

    const user = await usersStorage.findById(userId)
    if (!user) {
      throw new NotFoundError()
    }

    res.json(
      jwt.sign({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          locale: user.locale,
        }
      }, env.TOKEN_SECRET)
    )
  })

  router.post('/authenticate-web-app', async (req, res, next) => {
    try {
      const { initData } = authenticateWebAppSchema.create(req.body)

      if (!checkWebAppSignature(env.TELEGRAM_BOT_TOKEN, initData)) {
        throw new ApiError({
          code: 'INVALID_SIGNATURE',
          status: 400,
        })
      }

      const initDataUser = new URLSearchParams(initData).get('user')
      const telegramUser = initDataUser ? initDataUserSchema.create(JSON.parse(initDataUser)) : undefined
      if (!telegramUser) {
        throw new ApiError({
          code: 'INVALID_INIT_DATA',
          status: 400,
        })
      }

      const user = await usersStorage.findById(String(telegramUser.id))
      if (!user) {
        throw new NotFoundError()
      }

      res.json(jwt.sign({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          locale: user.locale,
        }
      }, env.TOKEN_SECRET))
    } catch (err) {
      console.warn(err)
      next(err)
    }
  })

  return router
}

/** @param {{ tokenSecret: string }} input */
export function createAuthMiddleware({ tokenSecret }) {
  /** @type {import('express-serve-static-core').RequestHandler} */
  return (req, _, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length
    if (!token) {
      throw new NotAuthenticatedError('Authentication token not provided')
    }

    try {
      req.user = authTokenSchema.create(jwt.verify(token, tokenSecret)).user
    } catch (err) {
      throw new NotAuthenticatedError('Invalid authentication token')
    }

    next()
  }
}

// https://gist.github.com/konstantin24121/49da5d8023532d66cc4db1136435a885?permalink_comment_id=4574538#gistcomment-4574538
/**
 * @param {string} botToken
 * @param {string} initData
 */
function checkWebAppSignature(botToken, initData) {
  const urlParams = new URLSearchParams(initData)

  const hash = urlParams.get('hash')
  urlParams.delete('hash')
  urlParams.sort()

  let dataCheckString = ''
  for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`
  }
  dataCheckString = dataCheckString.slice(0, -1)

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken)
  const calculatedHash = crypto.createHmac('sha256', secret.digest()).update(dataCheckString).digest('hex')

  return calculatedHash === hash
}

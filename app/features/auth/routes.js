import crypto from 'crypto'
import Router from 'express-promise-router'
import jwt from 'jsonwebtoken'
import { nonempty, number, object, optional, string, type } from 'superstruct'
import { userIdSchema } from '../../schemas/common.js'

export const temporaryAuthTokenSchema = nonempty(string())
export const temporaryAuthTokenPayloadSchema = type({ userId: userIdSchema })
export const authenticateWebAppSchema = object({ initData: string() })
export const initDataUserSchema = type({ id: number() })
export const authTokenSchema = type({
  user: type({
    id: userIdSchema,
    name: string(),
    username: optional(string()),
  })
})

/**
 * @param {{
 *   createRedisCache: ReturnType<import('../../utils/createRedisCacheFactory.js').createRedisCacheFactory>,
 *   telegramBotToken: string,
 *   tokenSecret: string,
 *   usersStorage: import('../../users/UsersPostgresStorage.js').UsersPostgresStorage,
 *   useTestMode: boolean,
 * }} input
 */
export function createAuthRouter({
  createRedisCache,
  telegramBotToken,
  tokenSecret,
  usersStorage,
  useTestMode,
}) {
  const router = Router()

  const temporaryAuthTokenCache = createRedisCache('tokens', useTestMode ? 60_000 : 5 * 60_000)

  router.get('/authenticate', async (req, res) => {
    const temporaryAuthToken = temporaryAuthTokenSchema.create(req.query['token'])
    if (!(await temporaryAuthTokenCache.set(temporaryAuthToken))) {
      res.status(400).json({ error: { code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE' } })
      return
    }

    let userId
    try {
      ({ userId } = temporaryAuthTokenPayloadSchema.create(jwt.verify(temporaryAuthToken, tokenSecret)))
    } catch (error) {
      res.status(400).json({ error: { code: 'INVALID_TEMPORARY_AUTH_TOKEN' } })
      return
    }

    const user = await usersStorage.findById(userId)
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND' } })
      return
    }

    res.json(
      jwt.sign({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
        }
      }, tokenSecret)
    )
  })

  router.post('/authenticate-web-app', async (req, res, next) => {
    try {
      const { initData } = authenticateWebAppSchema.create(req.body)

      if (!checkWebAppSignature(telegramBotToken, initData)) {
        res.status(400).json({ error: { code: 'INVALID_SIGNATURE' } })
        return
      }

      const initDataUser = new URLSearchParams(initData).get('user')
      const telegramUser = initDataUser ? initDataUserSchema.create(JSON.parse(initDataUser)) : undefined
      if (!telegramUser) {
        res.status(400).json({ error: { code: 'INVALID_INIT_DATA' } })
        return
      }

      const user = await usersStorage.findById(String(telegramUser.id))
      if (!user) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND' } })
        return
      }

      res.json(jwt.sign({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
        }
      }, tokenSecret))
    } catch (error) {
      console.warn(error)
      next(error)
    }
  })

  return router
}

/** @param {{ tokenSecret: string }} input */
export function createAuthMiddleware({ tokenSecret }) {
  /** @type {import('express-serve-static-core').RequestHandler} */
  return (req, res, next) => {
    const token = req.headers['authorization']?.slice(7) // 'Bearer ' length
    if (!token) {
      res.status(401).json({ error: { code: 'AUTH_TOKEN_NOT_PROVIDED' } })
      return
    }

    try {
      req.user = authTokenSchema.create(jwt.verify(token, tokenSecret)).user
      next()
    } catch (error) {
      res.status(401).json({ error: { code: 'INVALID_AUTH_TOKEN', message: error.message } })
    }
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

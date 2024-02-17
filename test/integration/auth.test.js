import { expect } from 'chai'
import jwt from 'jsonwebtoken'
import { createUser, createUsers, generateUserId, getAuthToken } from './helpers.js'
import { createTemporaryAuthTokenGenerator } from '../../src/auth/utils.js'
import { env } from '../../src/env.js'

const generateTemporaryAuthToken = createTemporaryAuthTokenGenerator({
  tokenSecret: env.TOKEN_SECRET,
  expiresInMs: 60_000,
})

describe('[auth]', () => {
  describe('GET /authenticate', () => {
    it('should exchange temporary auth token for a permanent one', async () => {
      const user = await createUser()

      const temporaryAuthToken = generateTemporaryAuthToken(user.id)
      const authToken = await getAuthToken(temporaryAuthToken)

      expect(jwt.verify(authToken, env.TOKEN_SECRET).user).to.deep.equal(user)
    })

    it('should not exchange temporary auth token twice', async () => {
      const user = await createUser()

      const temporaryAuthToken = generateTemporaryAuthToken(user.id)

      await getAuthToken(temporaryAuthToken)
      const response = await getAuthToken(temporaryAuthToken)

      expect(response).to.deep.equal({
        error: {
          code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE'
        }
      })
    })

    it('should not exchange permanent auth token', async () => {
      const user = createUser()
      const authToken = jwt.sign({ user }, env.TOKEN_SECRET)

      const response = await getAuthToken(authToken)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_TEMPORARY_AUTH_TOKEN'
        }
      })
    })

    it('should not exchange expired temporary auth token', async () => {
      const generateTemporaryAuthToken = createTemporaryAuthTokenGenerator({
        tokenSecret: env.TOKEN_SECRET,
        expiresInMs: 0,
      })

      const user = createUser()
      const temporaryAuthToken = await generateTemporaryAuthToken(user.id)

      const response = await getAuthToken(temporaryAuthToken)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_TEMPORARY_AUTH_TOKEN'
        }
      })
    })
  })
})
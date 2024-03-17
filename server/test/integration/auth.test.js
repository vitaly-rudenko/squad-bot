import { expect } from 'chai'
import jwt from 'jsonwebtoken'
import { createUser, createUsers, generateUserId, getAuthToken } from './helpers.js'
import { createCodeGenerator } from '../../src/auth/utils.js'
import { env } from '../../src/env.js'

const generateCode = createCodeGenerator({
  tokenSecret: env.TOKEN_SECRET,
  expiresInMs: 60_000,
})

describe('[auth]', () => {
  describe('GET /authenticate', () => {
    it('should exchange temporary auth token for a permanent one', async () => {
      const user = await createUser()

      const code = generateCode(user.id)
      const authToken = await getAuthToken(code)

      expect(jwt.verify(authToken, env.TOKEN_SECRET).user).to.deep.equal(user)
    })

    it('should not exchange temporary auth token twice', async () => {
      const user = await createUser()

      const code = generateCode(user.id)

      await getAuthToken(code)
      const response = await getAuthToken(code)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_CODE'
        }
      })
    })

    it('should not exchange permanent auth token', async () => {
      const user = createUser()
      const authToken = jwt.sign({ user }, env.TOKEN_SECRET)

      const response = await getAuthToken(authToken)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_CODE'
        }
      })
    })

    it('should not exchange expired temporary auth token', async () => {
      const generateCode = createCodeGenerator({
        tokenSecret: env.TOKEN_SECRET,
        expiresInMs: 0,
      })

      const user = createUser()
      const code = await generateCode(user.id)

      const response = await getAuthToken(code)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_CODE'
        }
      })
    })
  })
})
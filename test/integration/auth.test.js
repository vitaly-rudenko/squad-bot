import { expect } from 'chai'
import jwt from 'jsonwebtoken'
import { createUsers, generateUserId, getAuthToken } from './helpers.js'
import { string } from 'superstruct'

const tokenSecret = string().create(process.env.TOKEN_SECRET)

describe('[auth]', () => {
  describe('GET /authenticate', () => {
    it('should exchange temporary auth token for a permanent one', async () => {
      const [user] = await createUsers(1)

      const temporaryAuthToken = jwt.sign({ userId: user.id }, tokenSecret)
      const authToken = await getAuthToken(temporaryAuthToken)

      expect(jwt.verify(authToken, tokenSecret).user).to.deep.equal(user)
    })

    it('should not exchange temporary auth token twice', async () => {
      const [user] = await createUsers(1)

      const temporaryAuthToken = jwt.sign({ userId: user.id }, tokenSecret)

      await getAuthToken(temporaryAuthToken)
      const response = await getAuthToken(temporaryAuthToken)

      expect(response).to.deep.equal({
        error: {
          code: 'TEMPORARY_AUTH_TOKEN_CAN_ONLY_BE_USED_ONCE'
        }
      })
    })

    it('should not exchange permanent auth token', async () => {
      const user = { id: generateUserId(), name: 'fake-name', username: 'fake-username' }
      const temporaryAuthToken = jwt.sign({ user }, tokenSecret)

      const response = await getAuthToken(temporaryAuthToken)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_TEMPORARY_AUTH_TOKEN'
        }
      })
    })

    it('should not exchange expired temporary auth token', async () => {
      const [user] = await createUsers(1)
      const temporaryAuthToken = jwt.sign({ userId: user.id }, tokenSecret, {
        expiresIn: '100 ms',
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const response = await getAuthToken(temporaryAuthToken)

      expect(response).to.deep.equal({
        error: {
          code: 'INVALID_TEMPORARY_AUTH_TOKEN'
        }
      })
    })
  })
})
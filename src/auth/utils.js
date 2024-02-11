import jwt from 'jsonwebtoken'

/**
 * @param {{ tokenSecret: string; expiresInMs: number }} input
 * @returns {import('./types').GenerateTemporaryAuthToken}
 */
export function createTemporaryAuthTokenGenerator({ tokenSecret, expiresInMs }) {
  return (userId) => {
    return jwt.sign({ userId }, tokenSecret, { expiresIn: `${expiresInMs} ms` })
  }
}

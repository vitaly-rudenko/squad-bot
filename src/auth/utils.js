import jwt from 'jsonwebtoken'

/**
 * @param {{ tokenSecret: string; expiresInSeconds: number }} input
 * @returns {import('./types').GenerateTemporaryAuthToken}
 */
export function createTemporaryAuthTokenGenerator({ tokenSecret, expiresInSeconds }) {
  return (userId) => {
    return jwt.sign({ userId }, tokenSecret, { expiresIn: expiresInSeconds })
  }
}

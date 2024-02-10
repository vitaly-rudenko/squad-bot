import jwt from 'jsonwebtoken'

/**
 * @param {{ tokenSecret: string; useTestMode?: boolean }} input
 * @returns {import('./types').GenerateTemporaryAuthToken}
 */
export function createTemporaryAuthTokenGenerator({ tokenSecret, useTestMode = false }) {
  return (userId) => {
    return jwt.sign({ userId }, tokenSecret, { expiresIn: useTestMode ? '1 minute' : '5 minutes' })
  }
}

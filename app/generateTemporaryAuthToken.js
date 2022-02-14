import jwt from 'jsonwebtoken'

export function generateTemporaryAuthToken(userId) {
  return jwt.sign({ userId }, process.env.TOKEN_SECRET, { expiresIn: '1 minute' })
}

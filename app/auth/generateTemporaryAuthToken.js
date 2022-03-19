import jwt from 'jsonwebtoken'
import { useTestMode } from '../../env.js'

export function generateTemporaryAuthToken(userId) {
  return jwt.sign({ userId }, process.env.TOKEN_SECRET, { expiresIn: useTestMode ? '1 minute' : '5 minutes' })
}

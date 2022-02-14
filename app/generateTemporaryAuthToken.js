import jwt from 'jsonwebtoken'

export function generateTemporaryAuthToken(user) {
  return jwt.sign({ type: 'temporary', user }, process.TOKEN_SECRET, {
    expiresIn: '1 minute',
  })
}

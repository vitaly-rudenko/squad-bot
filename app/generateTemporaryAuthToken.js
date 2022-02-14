import jwt from 'jsonwebtoken'

export function generateTemporaryAuthToken(user) {
  return jwt.sign({ type: 'temporary', user }, process.env.TOKEN_SECRET, {
    expiresIn: '1 minute',
  })
}

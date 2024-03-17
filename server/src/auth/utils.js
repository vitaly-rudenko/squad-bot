import jwt from 'jsonwebtoken'

/**
 * @param {{ tokenSecret: string; expiresInMs: number }} input
 * @returns {import('./types').generateCode}
 */
export function createCodeGenerator({ tokenSecret, expiresInMs }) {
  return (userId) => {
    return jwt.sign({ userId }, tokenSecret, { expiresIn: `${expiresInMs} ms` })
  }
}

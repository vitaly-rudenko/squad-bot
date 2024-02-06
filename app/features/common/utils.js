import path from 'path'
import fs from 'fs'

/** @returns {string} */
export function getAppVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf-8' }))
    return packageJson?.version ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** @param {import('../../users/User.js').User} user */
export function renderUser(user) {
  return user.username ? `${user.name} (@${user.username})` : user.name
}

/** @param {number} input */
export function renderAmount(input) {
  if (!Number.isInteger(input)) {
    throw new Error('Input must be integer')
  }

  const fixed = (input / 100).toFixed(2)
  const amount = fixed.endsWith('.00') ? (input / 100).toFixed(0) : fixed

  return `₴${amount}`
}

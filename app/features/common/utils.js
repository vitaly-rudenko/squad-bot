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

/** @param {import('../../features/users/types').User} user */
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

/**
 * @param {T | undefined} value
 * @returns {value is T}
 * @template T
 */
export function isDefined(value) {
  return value !== undefined
}

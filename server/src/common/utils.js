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

/** @param {number} input */
export function renderAmount(input) {
  if (!Number.isSafeInteger(input)) {
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

/** @param {{ page: number; per_page: number }} pagination */
export function paginationToLimitOffset({ page, per_page }) {
  const limit = per_page
  const offset = (page - 1) * per_page
  return { limit, offset }
}

/** @template T @param {T[]} array */
export function unique(array) {
  return [...new Set(array)]
}

/**
 * Split array into groups.
 * Try make each group as large is possible, but less than `max`.
 * Group size must be at least `min`, unless array size is smaller.
 * Last group can be small.
 *
 * @param {T[]} array 
 * @param {{ min: number; max: number }} param1 
 * @returns {T[][]}
 * @template T
 */
export function splitArrayIntoGroups(array, { min, max }) {
  let groupSize = max
  while (array.length % groupSize < min && array.length % groupSize !== 0) {
    groupSize--
  }

  const groups = []
  for (let i = 0; i < array.length; i += groupSize) {
    groups.push(array.slice(i, i + groupSize))
  }

  return groups
}

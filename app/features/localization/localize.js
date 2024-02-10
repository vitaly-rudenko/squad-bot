import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import { localeFileSchema } from './schemas.js'

const uk = flattenLocaleFile(
  localeFileSchema.create(
    yaml.load(
      fs.readFileSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), 'locales', 'uk.yml'),
        'utf8',
      )
    )
  )
)

/**
 * @param {import('./types').Locale} locale
 * @param {import('./types').MessageKey} key
 * @param {Record<string, number | string>} [replacements]
 * @returns {string}
 */
export function localize(locale, key, replacements) {
  if (locale !== 'uk') {
    throw new Error(`Unsupported locale: "${locale}"`)
  }

  return replaceVariables(flattenMessage(uk[key]), replacements)
}

/**
 * @param {object} localeFile
 * @returns {Record<import('./types').MessageKey, string | string[]>}
 */
function flattenLocaleFile(localeFile) {
  /** @type {Record<string, any>} */
  const result = {}

  for (const [key, value] of Object.entries(localeFile)) {
    if (!Array.isArray(value) && typeof value === 'object') {
      const sub = flattenLocaleFile(value)
      for (const [subKey, subValue] of Object.entries(sub)) {
        result[`${key}.${subKey}`] = subValue
      }
    } else {
      result[key] = Array.isArray(value) ? value.map(String) : String(value)
    }
  }

  return result
}

/**
 * @param {string | string[]} message
 * @returns {string}
 */
function flattenMessage(message) {
  if (Array.isArray(message)) {
    return message
      .map((item, index, array) => (
        item.endsWith('\\')
          ? item.slice(0, -1)
          : (index === array.length - 1) ? item : `${item}\n`
      ))
      .join('')
  }

  return message
}

/**
 * @param {string} message
 * @param {Record<string, string | number>} [replacements]
 * @returns {string}
 */
function replaceVariables(message, replacements) {
  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      message = message.replaceAll(`{${key}}`, String(value))
    }
  }

  return message
}

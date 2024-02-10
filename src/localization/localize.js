import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import { localeFileSchema } from './schemas.js'

const en = flattenLocaleFile(
  localeFileSchema.create(
    yaml.load(
      fs.readFileSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), 'locales', 'en.yml'),
        'utf8',
      )
    )
  )
)

/**
 * @param {import('./types.js').Locale} _locale
 * @param {import('./types.js').MessageKey} key
 * @param {Record<string, number | string>} [replacements]
 * @returns {string}
 */
export function localize(_locale, key, replacements) {
  return replaceVariables(flattenMessage(en[key]), replacements)
}

/**
 * @param {object} localeFile
 * @returns {Record<import('./types.js').MessageKey, string | string[]>}
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
  return Array.isArray(message) ? message.join('\n') : message
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

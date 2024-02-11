import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import { localeFileSchema } from './schemas.js'

const en = flattenLocaleFile(
  // @ts-expect-error TODO
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
  if (!key) {
    throw new Error(`Invalid localization key: '${String(key)}'`)
  }

  const message = en[key]
  if (message === undefined) {
    throw new Error(`Missing message for localization key '${String(key)}'`)
  }

  return replaceVariables(message, replacements)
}

/**
 * @param {T} localeFile
 * @template {Record<string, string | T>} T
 */
function flattenLocaleFile(localeFile) {
  /** @type {Record<string, string>} */
  const result = {}

  for (const [key, value] of Object.entries(localeFile)) {
    if (typeof value === 'string') {
      result[key] = value
    } else {
      for (const [k, v] of Object.entries(flattenLocaleFile(value))) {
        result[`${key}.${k}`] = v
      }
    }
  }

  return result
}

/**
 * @param {string} message
 * @param {Record<string, string | number> | undefined} [replacements]
 * @returns {string}
 */
export function replaceVariables(message, replacements) {
  message = message.replaceAll(/\{[a-z0-9_]+\}/ig, (variable) => {
    const replacement = replacements?.[variable.slice(1, -1)]
    if (replacement === undefined) {
      throw new Error(`Missing replacement for variable ${String(variable)}`)
    }

    return String(replacement)
  })

  return message
}

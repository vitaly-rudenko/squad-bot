import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { fileURLToPath } from 'url'
import { localeFileSchema } from './schemas.js'

const defaultLocale = 'en'
/** @type {Record<string, ReturnType<(typeof flattenLocaleFile)>>} */
const locales = {
  en: flattenLocaleFile(
    // @ts-expect-error -- TODO: fix
    localeFileSchema.create(
      yaml.load(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'locales', 'en.yml'), 'utf8')),
    ),
  ),
  uk: flattenLocaleFile(
    // @ts-expect-error -- TODO: fix
    localeFileSchema.create(
      yaml.load(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'locales', 'uk.yml'), 'utf8')),
    ),
  ),
}

/**
 * @param {string} locale
 * @param {import('./types.js').MessageKey} key
 * @param {Record<string, number | string | undefined>} [replacements]
 * @returns {string}
 */
export function localize(locale, key, replacements) {
  if (!key) {
    throw new Error(`Invalid localization key: '${String(key)}'`)
  }

  const message = (locales[locale] || locales[defaultLocale])[key]
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
 * @param {Record<string, string | number | undefined>} [replacements]
 * @returns {string}
 */
export function replaceVariables(message, replacements) {
  message = message.replaceAll(/\{[a-z0-9_]+\}/gi, variable => {
    const replacement = replacements?.[variable.slice(1, -1)]
    if (replacement === undefined) {
      throw new Error(`Missing replacement for variable ${String(variable)}`)
    }

    return String(replacement)
  })

  return message
}

import fs from 'fs'
import { logger } from '../../logger.js'
import { escapeMd } from '../utils/escapeMd.js'

const cachedLocalizations = {}
function loadLocalization(name) {
  if (!cachedLocalizations[name]) {
    cachedLocalizations[name] = JSON.parse(fs.readFileSync(`./assets/localization/${name}.json`, { encoding: 'utf-8' }))
  }

  return cachedLocalizations[name]
}

function getMessages(locale) {
  return loadLocalization(locale)
}

/**
 * @param {string} messageKey
 * @param {string} locale
 * @returns {string}
 */
export function get(messageKey, locale) {
  const path = messageKey.split('.')

  let result = getMessages(locale)
  while (result) {
    const name = path.shift()
    if (!name) break

    result = result[name]
  }

  if (!result) {
    logger.warn(`Could not find localization key for "${messageKey}"`)
  }

  return result ?? escapeMd(messageKey)
}

/**
 * @param {string} locale
 * @param {string} messageKey
 * @param {Record<string, any>} [replacements]
 * @returns {string}
 */
export function localize(locale, messageKey, replacements) {
  let result = get(messageKey, locale)

  if (Array.isArray(result)) {
    result = result.map((item, index, array) => (
      item.endsWith('\\')
        ? item.slice(0, -1)
        : (index === array.length - 1) ? item : `${item}\n`
    )).join('')
  }

  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), value)
    }
  }

  return result
}

import fs from 'fs'
import { logger } from '../../logger.js'

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

export function get(messageKey, locale) {
  const path = messageKey.split('.')

  let result = getMessages(locale)
  while (result && path.length > 0) {
    result = result[path.shift()]
  }

  if (!result) {
    logger.warn(`Could not find localization key for "${messageKey}"`)
  }

  return result ?? messageKey
}

export function localize(locale, messageKey, replacements = null) {
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

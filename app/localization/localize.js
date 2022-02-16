import fs from 'fs'

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
    console.log(`Could not find localization key for "${messageKey}"`)
  }

  return result ?? messageKey
}

export function localize(messageKey, replacements = null, locale) {
  let result = get(messageKey, locale)

  if (Array.isArray(result)) {
    result = result.join('\n')
  }

  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), value)
    }
  }

  return result
}

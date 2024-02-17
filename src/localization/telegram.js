/** @type {import('./types').Locale} */
const defaultLocale = 'en'

/** @type {Record<string, import('./types').Locale>} */
const languageCodeLocaleMap = {
  en: 'en',
}

export const withLocale = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    if (!context.from) return

    context.state.locale = localeFromLanguageCode(context.from.language_code)
    return next()
  }
}

/**
 * @param {string} [languageCode]
 * @return {import('./types').Locale}
 */
export function localeFromLanguageCode(languageCode) {
  return (
    languageCode && languageCodeLocaleMap[languageCode] ||
    defaultLocale
  )
}

/** @type {import('./types').Locale} */
const defaultLocale = 'en'

/** @type {Record<string, import('./types').Locale>} */
const languageCodeLocaleMap = {
  en: 'en',
  uk: 'uk',
}

export const withLocale = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    const languageCode = context.from?.language_code || context.pollAnswer?.user?.language_code || undefined
    context.state.locale = localeFromLanguageCode(languageCode)

    return next()
  }
}

/**
 * @param {string} [languageCode]
 * @return {import('./types').Locale}
 */
export function localeFromLanguageCode(languageCode) {
  return (languageCode && languageCodeLocaleMap[languageCode]) || defaultLocale
}

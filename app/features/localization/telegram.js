const defaultLocale = 'uk'

/** @type {Record<string, import('./types').Locale>} */
const languageCodeLocaleMap = {
  // en: 'en',
  uk: 'uk',
}

export const withLocale = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    if (!context.from) return

    /** @type {import('./types').Locale} */
    const locale = (
      context.from.language_code && languageCodeLocaleMap[context.from.language_code] ||
      defaultLocale
    )

    context.state.locale = locale
    return next()
  }
}

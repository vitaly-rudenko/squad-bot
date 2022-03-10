import { Cache } from '../../utils/Cache.js'
import { localize } from '../localize.js'

const DEFAULT_LOCALE = 'uk'

export const withLocalization = (usersStorage) => {
  const localeCache = new Cache(60 * 60_000)

  /** @param {import('telegraf').Context} context */
  return async (context, next) => {
    const { userId } = context.state

    const locale = localeCache.get(userId)
      ?? (await usersStorage.findById(userId))?.locale
      ?? DEFAULT_LOCALE

    localeCache.set(userId, locale)

    context.state.localize = (message, replacements = null) =>
      localize(locale, message, replacements)

    return next()
  }
}

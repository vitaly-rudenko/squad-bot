import { localize } from '../localize.js'

export const withLocalization = (userManager) => {
  /** @param {import('telegraf').Context} context */
  return async (context, next) => {
    const { userId } = context.state

    const locale = await userManager.getCachedLocale(userId)
    context.state.localize = (message, replacements = null) =>
      localize(locale, message, replacements)

    return next()
  }
}

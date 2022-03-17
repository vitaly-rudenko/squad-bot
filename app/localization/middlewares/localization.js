import { localize } from '../localize.js'

const DEFAULT_LOCALE = 'uk'

export const withLocalization = ({ userManager }) => {
  /** @param {import('telegraf').Context} context */
  return async (context, next) => {
    const { userId } = context.state

    const user = await userManager.getCachedUser(userId)

    context.state.localize = (message, replacements = null) =>
      localize(user?.locale ?? DEFAULT_LOCALE, message, replacements)

    return next()
  }
}

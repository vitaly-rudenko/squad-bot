import { localize } from '../localize.js'

const DEFAULT_LOCALE = 'uk'

export const withLocalization = () => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    context.state.localize = (message, replacements = null) =>
      localize(context.state.user?.locale ?? DEFAULT_LOCALE, message, replacements);

    await next();
  }
}

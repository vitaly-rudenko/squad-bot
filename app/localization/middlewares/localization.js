import { localize } from '../localize.js'

// TODO: get rid of this
export const withLocalization = () => {
  /** @param {import('telegraf').Context} context */
  return async (context, next) => {
    context.state.localize = (message, replacements) =>
      localize('uk', message, replacements)

    return next()
  }
}

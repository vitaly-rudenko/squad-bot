import { fromTelegramUser } from '../fromTelegramUser.js'

export const registerUser = ({ userManager }) => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const user = fromTelegramUser(context.from)
    await userManager.softRegister(user)

    return next()
  }
}

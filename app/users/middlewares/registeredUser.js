import { fromTelegramUser } from '../fromTelegramUser.js'

export const registerUser = ({ userManager }) => {
  /** @param {import('telegraf').Context} context @param {Function} next */
  return async (context, next) => {
    const isPrivateChat = context.chat.type === 'private'

    const user = fromTelegramUser(context.from, { isPrivateChat })
    await userManager.softRegister(user)

    return next()
  }
}

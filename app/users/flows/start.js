import { fromTelegramUser } from '../fromTelegramUser.js'

export function startCommand({ userManager }) {
  return async (context) => {
    const { localize } = context.state

    const user = fromTelegramUser(context.from)
    const isNew = await userManager.hardRegister(user)

    await context.reply(localize(isNew ? 'command.start.signedUp' : 'command.start.updated'), { parse_mode: 'MarkdownV2' })
  }
}

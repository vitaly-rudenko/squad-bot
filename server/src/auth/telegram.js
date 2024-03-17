import { registry } from '../registry.js'

export function createAuthFlow() {
  const { generateTemporaryAuthToken, webAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const login = async (context) => {
    const { userId } = context.state

    await context.reply(`${webAppUrl}/?token=${generateTemporaryAuthToken(userId)}`)
  }

  return { login }
}

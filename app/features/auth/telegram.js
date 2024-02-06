/**
 * @param {{
 *   generateTemporaryAuthToken: import('./types').GenerateTemporaryAuthToken
 *   webAppUrl: string
 * }} input
 */
export function createAuthFlow({ generateTemporaryAuthToken, webAppUrl }) {
  /** @param {import('telegraf').Context} context */
  const login = async (context) => {
    const { userId } = context.state

    await context.reply(`${webAppUrl}?token=${generateTemporaryAuthToken(userId)}`)
  }

  return { login }
}

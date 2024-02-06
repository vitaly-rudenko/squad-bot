/**
 * @param {{ version: string }} input
 */
export function createCommonFlow({ version: appVersion }) {
  /** @param {import('telegraf').Context} context */
  const version = async (context) => {
    if (!context.from || !context.chat) return

    await context.reply([
      `Version: ${appVersion}`,
      `Bot ID: ${context.botInfo.id}`,
      `User ID: ${context.from.id}`,
      `Chat ID: ${context.chat.id} (${context.chat.type})`,
    ].join('\n'))
  }

  return { version }
}

const ignoredErrors = ['chat not found', "bot can't initiate conversation with a user"]
/** @param {Error} err */
export function isNotificationErrorIgnorable(err) {
  return ignoredErrors.some(m => err.message.includes(m))
}

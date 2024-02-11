/**
 * @param {{
 *   userId: string
 *   groupId: string
 *   telegram: import('telegraf').Telegram
 * }} input
 */
export async function isChatMember({ userId, groupId, telegram }) {
  try {
    await telegram.getChatMember(groupId, Number(userId))
  } catch (err) {
    // TODO: check for error message
    if (err.code === 400) {
      return false
    }

    throw err
  }

  return true
}

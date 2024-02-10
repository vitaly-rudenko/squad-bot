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
  } catch (error) {
    // TODO: check for error message
    if (error.code === 400) {
      return false
    }

    throw error
  }

  return true
}

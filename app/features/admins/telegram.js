import { escapeMd } from '../../utils/escapeMd.js'
import { GROUP_CHAT_TYPES } from '../../shared/middlewares/groupChat.js'

/**
 * @param {{
 *   generateWebAppUrl: import('../../utils/types').GenerateWebAppUrl
 * }} input
 */
export function createAdminsFlow({ generateWebAppUrl }) {
  /** @param {import('telegraf').Context} context */
  const titles = async (context) => {
    const { chatId, localize } = context.state

    const isGroup = GROUP_CHAT_TYPES.includes(/** @type {string} */ (context.chat?.type))

    const editUrl = isGroup ? generateWebAppUrl(`titles-${chatId}`) : generateWebAppUrl('groups')

    await context.reply(
      localize('command.titles.help', {
        editUrl: escapeMd(editUrl),
      }),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    )
  }

  return { titles }
}

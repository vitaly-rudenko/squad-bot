import { escapeMd } from '../../utils/escapeMd.js'
import { GROUP_CHAT_TYPES } from '../../shared/middlewares/groupChat.js'
import { registry } from '../../registry.js'

export function createAdminsFlow() {
  const { generateWebAppUrl, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const titles = async (context) => {
    const { chatId, locale } = context.state

    const isGroup = GROUP_CHAT_TYPES.includes(/** @type {string} */ (context.chat?.type))

    const editUrl = isGroup ? generateWebAppUrl(`titles${chatId}`) : generateWebAppUrl('groups')

    await context.reply(
      localize(locale, 'admins.titles.command.message', { editUrl: escapeMd(editUrl) }),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    )
  }

  return { titles }
}

import { escapeMd } from '../../utils/escapeMd.js'
import { GROUP_CHAT_TYPES } from '../../shared/middlewares/groupChat.js'

export function titleCommand({ generateWebAppUrl }) {
  return async (context) => {
    const { chatId, localize } = context.state

    const isGroup = GROUP_CHAT_TYPES.includes(context.chat.type)

    const editUrl = isGroup ? generateWebAppUrl('group', chatId, 'titles') : generateWebAppUrl('groups')

    await context.reply(
      localize('command.title.help', {
        editUrl: escapeMd(editUrl),
      }),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    )
  }
}

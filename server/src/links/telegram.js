import { escapeMd } from '../common/telegram.js'
import { registry } from '../registry.js'

export function createLinksFlow() {
  const { linksStorage, localize, generateWebAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const links = async context => {
    const { chatId, locale } = context.state

    const { items: links } = await linksStorage.find({ groupIds: [chatId] })

    const viewUrl = generateWebAppUrl(`links${chatId}`)

    if (links.length === 0) {
      await context.reply(
        localize(locale, 'links.command.noLinks', {
          viewUrl: escapeMd(viewUrl),
        }),
        {
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        },
      )
    } else {
      await context.reply(
        localize(locale, 'links.command.message', {
          viewUrl: escapeMd(viewUrl),
          links: links
            .map(link =>
              localize(locale, 'links.command.linksListItem', {
                label: escapeMd(link.label),
                url: escapeMd(link.url),
              }),
            )
            .join(localize(locale, 'links.command.linksListDelimiter')),
        }),
        { parse_mode: 'MarkdownV2', disable_web_page_preview: true },
      )
    }
  }

  return {
    links,
  }
}

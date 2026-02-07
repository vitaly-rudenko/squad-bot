import { Markup } from 'telegraf'
import { isGroupChat, isPrivateChat } from '../common/telegram.js'
import { registry } from '../registry.js'
import { fixSocialLinkUrl } from './fix-social-link-url.js'

export function createSocialLinkFixFlow() {
  const { groupCache, groupStorage, socialLinksCache, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const toggleSocialLinkFix = async context => {
    const { chatId, locale } = context.state

    const group = await groupStorage.findById(chatId)
    if (!group) return

    await groupStorage.store({
      id: group.id,
      title: group.title,
      socialLinkFixEnabledAt: group.socialLinkFixEnabledAt ? null : new Date(),
    })
    await groupCache.delete(chatId)

    await context.reply(
      localize(locale, group.socialLinkFixEnabledAt ? 'socialLinkFix.disabled' : 'socialLinkFix.enabled'),
    )
  }

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  const socialLinkFixMessage = async (context, next) => {
    if (!context.message) return next()

    // IDs between Bot API and Telegram API are different, so we're using timestamps
    if ('forward_date' in context.message) {
      const existingSocialLink = await socialLinksCache.get(`squad-bot:${context.message.forward_date}`)
      if (existingSocialLink) {
        await context.forwardMessage(existingSocialLink.linkMessage.chatId, { disable_notification: true })
        await context.deleteMessage().catch(() => {})
        return
      }
    }

    if (!('text' in context.message)) return next()
    const { chatId, locale } = context.state
    if (!chatId) return next()

    // Check if social link fix is enabled if message belongs to a group chat
    if (isGroupChat(context)) {
      let group = await groupCache.get(chatId)
      if (!group) {
        group = await groupStorage.findById(chatId)
        if (group) {
          await groupCache.set(chatId, group)
        }
      }

      if (!group) return
      if (!group.socialLinkFixEnabledAt) return
    } else if (isPrivateChat(context)) {
      // no checks
    } else {
      return // unsupported chat type
    }

    const urlEntities = context.message.entities?.filter(e => e.type === 'url')
    if (!urlEntities || urlEntities.length === 0) return
    if (urlEntities.length !== 1) return // Only support one link currently
    const { offset, length } = urlEntities[0]

    const url = context.message.text.slice(offset, offset + length)

    const fixedSocialLinkUrl = fixSocialLinkUrl(url)
    if (!fixedSocialLinkUrl) return

    const message = await context.reply(fixedSocialLinkUrl, {
      reply_parameters: {
        message_id: context.message.message_id,
        allow_sending_without_reply: true,
      },
      disable_notification: true,
      ...Markup.inlineKeyboard([
        Markup.button.callback(localize(locale, 'socialLinkFix.actions.accept'), 'delete_reply_markup'),
        Markup.button.callback(localize(locale, 'socialLinkFix.actions.reject'), 'delete_message'),
      ]),
    })

    /** @type {import('./types.js').SocialLink} */
    const socialLink = {
      url,
      linkMessage: { chatId, messageId: String(context.message.message_id) },
      simpleFixMessage: { chatId, messageId: String(message.message_id) },
    }

    const simpleFixKey = `${chatId}:${message.message_id}`
    await socialLinksCache.set(simpleFixKey, socialLink)
  }

  return {
    toggleSocialLinkFix,
    socialLinkFixMessage,
  }
}

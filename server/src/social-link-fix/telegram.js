import { registry } from '../registry.js'
import { fixSocialLinkUrl } from './fix-social-link-url.js'

export function createSocialLinkFixFlow() {
  const { groupCache, groupStorage } = registry.export()

  /** @param {import('telegraf').Context} context */
  const toggleSocialLinkFix = async (context) => {
    const { chatId } = context.state

    const group = await groupStorage.findById(chatId)
    if (!group) return

    await groupStorage.store({
      id: group.id,
      title: group.title,
      socialLinkFixEnabledAt: group.socialLinkFixEnabledAt ? null : new Date(),
    })
    await groupCache.delete(chatId)

    await context.reply(group.socialLinkFixEnabledAt ? 'Social link fix has been disabled' : 'Social link fix has been enabled')
  }

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  const socialLinkFixMessage = async (context, next) => {
    if (!context.message || !('text' in context.message)) return next()
    const { chatId } = context.state

    let group = await groupCache.get(chatId)
    if (!group) {
      group = await groupStorage.findById(chatId)
      if (group) {
        await groupCache.set(chatId, group)
      }
    }

    if (!group) return
    if (!group.socialLinkFixEnabledAt) return

    const urlEntities = context.message.entities?.filter(e => e.type === 'url')
    if (!urlEntities || urlEntities.length === 0) return
    if (urlEntities.length !== 1) return // Only support one link currently
    const { offset, length } = urlEntities[0]
    
    const fixedSocialLinkUrl = fixSocialLinkUrl(context.message.text.slice(offset, offset + length))
    if (!fixedSocialLinkUrl) return

    await context.reply(fixedSocialLinkUrl, {
      reply_to_message_id: context.message.message_id,
      disable_notification: true,
      allow_sending_without_reply: true,
    })

    console.log('Fixing social link in', group)
  }

  return {
    toggleSocialLinkFix,
    socialLinkFixMessage,
  }
}

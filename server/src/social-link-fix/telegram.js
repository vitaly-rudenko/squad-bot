import { Markup } from 'telegraf'
import { isGroupChat, isPrivateChat } from '../common/telegram.js'
import { registry } from '../registry.js'
import { fixSocialLinkUrl } from './fix-social-link-url.js'
import { env } from '../env.js'
import { logger } from '../common/logger.js'

export function createSocialLinkFixFlow() {
  const { groupCache, groupStorage, telegramClient, socialLinksCache, localize, telegram } = registry.export()

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
    if (!context.message || !('text' in context.message)) return next()
    const { chatId } = context.state
    if (!chatId) return

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

    // Advanced integration for Instagram links
    if (
      telegramClient &&
      env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID &&
      env.TELEGRAM_WHITELISTED_CHAT_IDS_FOR_INSTAGRAM_INTEGRATION?.includes(chatId) &&
      (url.startsWith('https://instagram.com/reel/') || url.startsWith('https://www.instagram.com/reel/'))
    ) {
      try {
        logger.info({ url }, 'Using advanced Instagram integration')

        const results = await telegramClient.forwardMessages(env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID, {
          fromPeer: chatId,
          messages: [context.message.message_id],
        })

        /** @type {import('telegram').Api.Message} */
        // @ts-expect-error For some reason type is not correct in telegram.js library, this returns 2D array
        const forwardedMessage = results[0][0]

        /** @type {import('./types.js').SocialLink} */
        const socialLink = {
          url,
          sourceChatId: chatId,
          sourceMessageId: String(context.message.message_id),
          sourceUserId: String(context.message.from.id),
          targetChatId: String(env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID),
          targetMessageId: String(forwardedMessage.id),
        }

        const key = `${socialLink.targetChatId}:${socialLink.targetMessageId}`
        await socialLinksCache.set(key, socialLink)
        await socialLinksCache.set(url, socialLink)

        return
      } catch (err) {
        logger.error({ err, url }, 'Failed to handle advanced Instagram integration')

        // Continue with the rudimentary approach
      }
    }

    const fixedSocialLinkUrl = fixSocialLinkUrl(url)
    if (!fixedSocialLinkUrl) return

    await context.reply(fixedSocialLinkUrl, {
      reply_parameters: {
        message_id: context.message.message_id,
        allow_sending_without_reply: true,
      },
      disable_notification: true,
      ...Markup.inlineKeyboard([Markup.button.callback('Delete', 'delete_message')]),
    })
  }

  /** @param {any} event */
  const telegramClientEvent = async event => {
    if (!telegramClient) return // Advanced integration is not set up

    try {
      // Some messages are sent like this (e.g. direct messages)
      // Currently this handles the final result (for example, a video) which usually has original link in the caption
      if (event.className === 'UpdateNewMessage') {
        const messageId = event.message.id
        const messageText = event.message.message
        if (!messageText.includes('instagram.com')) return

        const url = messageText
        const socialLink = await socialLinksCache.get(url)
        if (!socialLink) return

        logger.info({ messageText, socialLink }, 'Received SocialLink update from advanced Instagram integration')

        // Forward message from the bot to the original chat
        await telegramClient.forwardMessages(socialLink.sourceChatId, {
          fromPeer: socialLink.targetChatId,
          messages: [messageId],
        })

        // Remove reaction if present
        await telegram
          .setMessageReaction(Number(socialLink.sourceChatId), Number(socialLink.sourceMessageId), [])
          .catch(() => {})

        // Mark as read
        await telegramClient.markAsRead(socialLink.targetChatId, undefined, { clearMentions: true }).catch(() => {})
      }

      // Some messages are sent like this (e.g. replies from bot)
      // Currently this handles intermediate messages like processing status and failures
      if (event.className === 'UpdateShortMessage') {
        const messageId = event.id
        const messageText = event.message
        const targetChatId = event.userId?.toString()
        const targetMessageId = event.replyTo?.replyToMsgId

        const key = `${targetChatId}:${targetMessageId}`
        const socialLink = await socialLinksCache.get(key)
        if (!socialLink) return

        logger.info({ messageText, socialLink }, 'Received SocialLink update from advanced Instagram integration')

        if (messageText.includes('Processing...')) {
          // Set a reaction instead of sending a message
          await telegram
            .setMessageReaction(Number(socialLink.sourceChatId), Number(socialLink.sourceMessageId), [
              { type: 'emoji', emoji: '👀' },
            ])
            .catch(() => {})
        } else {
          // Forward message from the bot to the original chat
          await telegramClient.forwardMessages(socialLink.sourceChatId, {
            fromPeer: socialLink.targetChatId,
            messages: [messageId],
            silent: true,
          })

          // Remove reaction if present
          await telegram
            .setMessageReaction(Number(socialLink.sourceChatId), Number(socialLink.sourceMessageId), [])
            .catch(() => {})
        }

        // Mark as read
        await telegramClient.markAsRead(socialLink.targetChatId, undefined, { clearMentions: true }).catch(() => {})
      }
    } catch (err) {
      logger.error({ err }, 'Failed to handle Telegram Client event')
    }
  }

  return {
    toggleSocialLinkFix,
    socialLinkFixMessage,
    telegramClientEvent,
  }
}

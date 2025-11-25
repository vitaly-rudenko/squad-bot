import { Markup } from 'telegraf'
import { isGroupChat, isPrivateChat } from '../common/telegram.js'
import { registry } from '../registry.js'
import { fixSocialLinkUrl } from './fix-social-link-url.js'
import { env } from '../env.js'
import { logger } from '../common/logger.js'

export function createSocialLinkFixFlow() {
  const { groupCache, groupStorage, telegramClient, socialLinksCache, localize, telegram, botInfo } = registry.export()

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

    // Advanced integration for SocialLinks
    const isAdvancedIntegrationAllowed =
      telegramClient &&
      env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID &&
      env.TELEGRAM_WHITELISTED_CHAT_IDS_FOR_INSTAGRAM_INTEGRATION?.includes(chatId) &&
      (url.startsWith('https://instagram.com/reel/') ||
        url.startsWith('https://www.instagram.com/reel/') ||
        url.startsWith('https://instagram.com/p/') ||
        url.startsWith('https://www.instagram.com/p/') ||
        url.startsWith('https://youtube.com/shorts/') ||
        url.startsWith('https://m.youtube.com/shorts/'))

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
        // ...(isAdvancedIntegrationAllowed
        //   ? [Markup.button.callback(localize(locale, 'socialLinkFix.actions.retry'), 'try_advanced_integration')]
        //   : []),
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

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  const tryAdvancedIntegration = async (context, next) => {
    if (!context.callbackQuery?.message) return next()
    const { chatId } = context.state
    if (!chatId) return next()

    const simpleFixKey = `${chatId}:${context.callbackQuery.message.message_id}`
    const socialLink = await socialLinksCache.get(simpleFixKey)
    if (!socialLink) return next()

    await context.answerCbQuery().catch(() => {})
    await context.deleteMessage().catch(() => {})

    if (
      !telegramClient ||
      !env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID ||
      !env.TELEGRAM_WHITELISTED_CHAT_IDS_FOR_INSTAGRAM_INTEGRATION?.includes(chatId)
    ) {
      return
    }

    try {
      logger.info({ socialLink }, 'Using advanced integration for SocialLinks')

      // Forward initial message with link to the Advanced Integration bot
      const results = await telegramClient.forwardMessages(env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID, {
        fromPeer: Number(socialLink.linkMessage.chatId),
        messages: [Number(socialLink.linkMessage.messageId)],
      })

      /** @type {import('telegram').Api.Message} */
      // @ts-expect-error For some reason type is not correct in telegram.js library, this returns 2D array
      const forwardedMessage = results[0][0]

      /** @type {import('./types.js').SocialLink} */
      const updatedSocialLink = {
        ...socialLink,
        advancedIntegrationInitialMessage: {
          chatId: String(env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID),
          messageId: String(forwardedMessage.id),
        },
      }

      const advancedIntegrationInitialKey = `${env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID}:${forwardedMessage.id}`
      await socialLinksCache.set(advancedIntegrationInitialKey, updatedSocialLink) // for "UpdateShortMessage"
      await socialLinksCache.set(updatedSocialLink.url, updatedSocialLink) // for "UpdateNewMessage"
    } catch (err) {
      logger.error({ err, socialLink }, 'Failed to handle advanced integration for SocialLinks')
    }
  }

  /** @param {any} event */
  const telegramClientEvent = async event => {
    if (!telegramClient) return // Advanced integration is not set up

    try {
      // Some messages are sent like this (e.g. direct messages)
      // Currently this handles the final result (for example, a video) which usually has original link in the caption
      if (event.className === 'UpdateNewMessage') {
        /** @type {import('telegram').Api.Message} */
        const message = event.message

        // Only handle messages from the Advanced Integration Bot
        if (!message.chatId || message.chatId.toJSNumber() !== env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID) return

        const messageId = message.id
        const messageText = message.message
        if (!messageText.includes('instagram.com') && !messageText.includes('youtube.com')) return

        const url = messageText
        const socialLink = await socialLinksCache.get(url)
        if (!socialLink) return

        logger.info({ messageText, socialLink }, 'Received SocialLink update from advanced integration')

        // Forward message from the Advanced Integration Bot to Squad Bot
        const squadBotEntity = await telegramClient.getEntity(botInfo.id)
        const results = await telegramClient.forwardMessages(squadBotEntity, {
          fromPeer: message.chatId,
          messages: [messageId],
          silent: true,
        })

        /** @type {import('telegram').Api.Message} */
        // @ts-expect-error For some reason type is not correct in telegram.js library, this returns 2D array
        const forwardedMessage = results[0][0]

        // IDs between Bot API and Telegram API are different, so we're using timestamps
        const forwardedKey = `squad-bot:${forwardedMessage.date}`
        await socialLinksCache.set(forwardedKey, socialLink)

        // Delete message from the Advanced Integration Bot after it was forwarded
        await telegramClient.deleteMessages(message.chatId, [messageId], { revoke: true }).catch(() => {})

        // Delete initial message from the Advanced Integration Bot
        if (socialLink.advancedIntegrationInitialMessage) {
          await telegramClient
            .deleteMessages(
              Number(socialLink.advancedIntegrationInitialMessage.chatId),
              [Number(socialLink.advancedIntegrationInitialMessage.messageId)],
              { revoke: true },
            )
            .catch(() => {})
        }

        // Remove reaction if present
        await telegram
          .setMessageReaction(Number(socialLink.linkMessage.chatId), Number(socialLink.linkMessage.messageId), [])
          .catch(() => {})
      }

      // Some messages are sent like this (e.g. replies from bot)
      // Currently this handles intermediate messages like processing status and failures
      if (event.className === 'UpdateShortMessage') {
        // Only handle messages from the Advanced Integration Bot
        if (event.userId.toJSNumber() !== env.TELEGRAM_INSTAGRAM_INTEGRATION_BOT_ID) return

        const messageId = event.id
        const messageText = event.message
        const targetChatId = event.userId?.toString()
        const targetMessageId = event.replyTo?.replyToMsgId

        const key = `${targetChatId}:${targetMessageId}`
        const socialLink = await socialLinksCache.get(key)
        if (!socialLink) return

        logger.info({ messageText, socialLink }, 'Received SocialLink update from advanced integration')

        if (messageText.includes('Processing...')) {
          // In case of "Processing..." message, just use a reaction instead of forwarding it
          await telegram
            .setMessageReaction(Number(socialLink.linkMessage.chatId), Number(socialLink.linkMessage.messageId), [
              { type: 'emoji', emoji: '👀' },
            ])
            .catch(() => {})
        } else {
          // Remove reaction if present
          await telegram
            .setMessageReaction(Number(socialLink.linkMessage.chatId), Number(socialLink.linkMessage.messageId), [])
            .catch(() => {})

          // Forward message from the Advanced Integration Bot to Squad Bot
          const squadBotEntity = await telegramClient.getEntity(botInfo.id)
          const results = await telegramClient.forwardMessages(squadBotEntity, {
            fromPeer: event.userId,
            messages: [messageId],
            silent: true,
          })

          /** @type {import('telegram').Api.Message} */
          // @ts-expect-error For some reason type is not correct in telegram.js library, this returns 2D array
          const forwardedMessage = results[0][0]

          // IDs between Bot API and Telegram API are different, so we're using timestamps
          const forwardedKey = `squad-bot:${forwardedMessage.date}`
          await socialLinksCache.set(forwardedKey, socialLink)
        }

        // Delete message from the Advanced Integration Bot after it was forwarded
        await telegramClient.deleteMessages(event.userId, [messageId], { revoke: true }).catch(() => {})
      }
    } catch (err) {
      logger.error({ err }, 'Failed to handle Telegram Client event')
    }
  }

  return {
    toggleSocialLinkFix,
    socialLinkFixMessage,
    telegramClientEvent,
    tryAdvancedIntegration,
  }
}

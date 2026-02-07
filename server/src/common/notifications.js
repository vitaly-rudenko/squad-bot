import { logger } from './logger.js'
import { isNotificationErrorIgnorable } from './telegram.js'

/**
 *
 * @param {string} userId
 * @param {string} message
 * @param {Parameters<import('telegraf').Telegram['sendMessage']>[2]} options
 * @param {import('../types').Deps<'telegram'>} deps
 */
export function sendNotification(userId, message, options, { telegram }) {
  telegram
    .sendMessage(Number(userId), message, {
      parse_mode: 'MarkdownV2',
      link_preview_options: { is_disabled: true },
      ...options,
    })
    .catch(err => {
      if (!isNotificationErrorIgnorable(err)) {
        logger.warn({ err, message, options }, 'Could not send notification')
      }
    })
}


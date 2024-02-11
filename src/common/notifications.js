import { logger } from './logger.js'
import { isNotificationErrorIgnorable } from './telegram.js'

/**
 *
 * @param {string} userId
 * @param {string} message
 * @param {import('../types').Deps<'telegram'>} deps
 */
export function sendNotification(userId, message, { telegram }) {
  telegram.sendMessage(Number(userId), message, {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  }).catch((err) => {
    if (!isNotificationErrorIgnorable(err)) {
      logger.warn({ err, userId, message }, 'Could not send notification')
    }
  })
}
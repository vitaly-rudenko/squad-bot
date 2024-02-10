import { disableTelegramApi } from '../../../env.js'
import { logger } from '../../../logger.js'
import { registry } from '../../registry.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { isNotificationErrorIgnorable } from '../common/telegram.js'
import { renderAmount, renderUser } from '../common/utils.js'
import { deduplicateUsers } from '../users/utils.js'

/**
 * @param {{
 *   action: 'create' | 'update'
 *   editorId: string
 *   payment: import('./types.js').Payment
 * }} input
 */
export async function sendPaymentSavedNotification(
  { action, editorId, payment },
  { localize, usersStorage, telegram } = registry.export()
) {
  const [editor, sender, receiver] = await usersStorage.findAndMapByIds([
    editorId,
    payment.fromUserId,
    payment.toUserId,
  ])

  if (!editor || !sender || !receiver) return

  const users = deduplicateUsers([editor, sender, receiver])

  for (const user of users) {
    const message = localize(
      user.locale,
      'payments.notifications.saved.message',
      {
        editor: escapeMd(renderUser(editor)),
        sender: escapeMd(renderUser(sender)),
        receiver: escapeMd(renderUser(receiver)),
        amount: escapeMd(renderAmount(payment.amount)),
        action: localize(user.locale, `payments.notifications.saved.action.${action}`),
      }
    )

    try {
      if (disableTelegramApi) continue
      await telegram.sendMessage(Number(user.id), message, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      })
    } catch (err) {
      if (!isNotificationErrorIgnorable(err)) {
        logger.warn({ err, user, message }, 'Could not send notification')
      }
    }
  }
}

/**
 * @param {{
 *   editorId: string
 *   payment: import('./types.js').Payment
 * }} input
 */
export async function sendPaymentDeletedNotification(
  { editorId, payment },
  { localize, usersStorage, telegram } = registry.export()
) {
  const [editor, sender, receiver] = await usersStorage.findAndMapByIds([
    editorId,
    payment.fromUserId,
    payment.toUserId,
  ])

  if (!editor || !sender || !receiver) return

  const users = deduplicateUsers([editor, sender, receiver])

  for (const user of users) {
    const message = localize(
      user.locale,
      'payments.notifications.deleted.message',
      {
        editor: escapeMd(renderUser(editor)),
        sender: escapeMd(renderUser(sender)),
        receiver: escapeMd(renderUser(receiver)),
        amount: escapeMd(renderAmount(payment.amount)),
      }
    )

    try {
      if (disableTelegramApi) continue
      await telegram.sendMessage(Number(user.id), message, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      })
    } catch (err) {
      if (!isNotificationErrorIgnorable(err)) {
        logger.warn({ err, user, message }, 'Could not send notification')
      }
    }
  }
}

import { disableTelegramApi } from '../../../env.js'
import { logger } from '../../../logger.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { isNotificationErrorIgnorable } from '../common/telegram.js'
import { renderAmount, renderUser } from '../common/utils.js'

/**
 * @param {{
 *   action: 'create' | 'update'
 *   editorId: string
 *   payment: import('./types.js').Payment
 *   localize: import('../../localization/localize.js').localize
 *   usersStorage: import('../../users/UsersPostgresStorage.js').UsersPostgresStorage
 *   telegram: import('telegraf').Telegram
 * }} input
 */
export async function sendPaymentSavedNotification({
  action,
  editorId,
  payment,
  localize,
  usersStorage,
  telegram,
}) {
  const [editor, sender, receiver] = await usersStorage.findAndMapByIds([
    editorId,
    payment.fromUserId,
    payment.toUserId,
  ])

  if (!editor || !sender || !receiver) return

  for (const user of [sender, receiver]) {
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
      await telegram.sendMessage(user.id, message, {
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
 *   localize: import('../../localization/localize.js').localize
 *   usersStorage: import('../../users/UsersPostgresStorage.js').UsersPostgresStorage
 *   telegram: import('telegraf').Telegram
 * }} input
 */
export async function sendPaymentDeletedNotification({
  editorId,
  payment,
  localize,
  usersStorage,
  telegram,
}) {
  const [editor, sender, receiver] = await usersStorage.findAndMapByIds([
    editorId,
    payment.fromUserId,
    payment.toUserId,
  ])

  if (!editor || !sender || !receiver) return

  for (const user of [sender, receiver]) {
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
      await telegram.sendMessage(user.id, message, {
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

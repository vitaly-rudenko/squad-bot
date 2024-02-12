import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'
import { renderAmount } from '../common/utils.js'
import { deduplicateUsers } from '../users/utils.js'
import { sendNotification } from '../common/notifications.js'
import { renderUserMd } from '../users/telegram.js'

/**
 * @param {{
 *   action: 'create' | 'update'
 *   editorId: string
 *   payment: import('./types.js').Payment
 * }} input
 * @param {import('../types').Deps<'localize' | 'usersStorage' | 'telegram'>} deps
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
    sendNotification(user.id, localize(
      user.locale,
      'payments.notifications.saved.message',
      {
        editor: renderUserMd(editor),
        sender: renderUserMd(sender),
        receiver: renderUserMd(receiver),
        amount: escapeMd(renderAmount(payment.amount)),
        action: localize(user.locale, `payments.notifications.saved.action.${action}`),
      }
    ), {}, { telegram })
  }
}

/**
 * @param {{
 *   editorId: string
 *   payment: import('./types.js').Payment
 * }} input
 * @param {import('../types').Deps<'localize' | 'usersStorage' | 'telegram'>} deps
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
    sendNotification(user.id, localize(
      user.locale,
      'payments.notifications.deleted.message',
      {
        editor: renderUserMd(editor),
        sender: renderUserMd(sender),
        receiver: renderUserMd(receiver),
        amount: escapeMd(renderAmount(payment.amount)),
      }
    ), {}, { telegram })
  }
}

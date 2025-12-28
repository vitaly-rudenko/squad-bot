import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'
import { renderAmount } from '../common/utils.js'
import { deduplicateUsers } from '../users/utils.js'
import { sendNotification } from '../common/notifications.js'
import { renderUserMd } from '../users/telegram.js'
import { aggregateDebts } from '../debts/utils.js'
import { prepareDebtsForUser } from '../receipts/utils.js'
import { generatePayCommand } from '../web-app/utils.js'

/**
 * @param {{
 *   action: 'create' | 'update'
 *   editorId: string
 *   payment: import('./types.js').Payment
 * }} input
 * @param {import('../types').Deps<
 *   | 'localize'
 *   | 'usersStorage'
 *   | 'debtsStorage'
 *   | 'paymentsStorage'
 *   | 'telegram'
 *   | 'generateWebAppUrl'
 * >} deps
 */
export async function sendPaymentSavedNotification(
  { action, editorId, payment },
  { localize, usersStorage, debtsStorage, paymentsStorage, telegram, generateWebAppUrl } = registry.export(),
) {
  const users = await usersStorage.find({ ids: [editorId, payment.fromUserId, payment.toUserId] })
  const editor = users.find(u => u.id === editorId)
  const sender = users.find(u => u.id === payment.fromUserId)
  const receiver = users.find(u => u.id === payment.toUserId)

  if (!editor || !sender || !receiver) return

  const { ingoingDebts, outgoingDebts } = await aggregateDebts({
    userId: sender.id,
    debtsStorage,
    paymentsStorage,
  })

  console.log('payment', { description: payment.description })

  for (const user of deduplicateUsers([editor, sender, receiver])) {
    const preparedDebts = prepareDebtsForUser({
      user,
      debtors: [sender, receiver],
      ingoingDebts,
      outgoingDebts,
    })

    sendNotification(
      user.id,
      localize(user.locale, 'payments.notifications.saved.message', {
        editor: renderUserMd(editor),
        sender: renderUserMd(sender),
        receiver: renderUserMd(receiver),
        amount: escapeMd(renderAmount(payment.amount)),
        description: payment.description
          ? localize(user.locale, 'payments.notifications.saved.description', {
              description: escapeMd(payment.description),
            })
          : '',
        action: localize(user.locale, `payments.notifications.saved.action.${action}`),
        debts: [
          ...preparedDebts.outgoingDebts.map(debt =>
            localize(user.locale, 'payments.notifications.saved.outgoingDebt', {
              name: renderUserMd(debt.debtor),
              amount: escapeMd(renderAmount(debt.amount)),
              payUrl: generateWebAppUrl(generatePayCommand({ toUserId: debt.debtor.id, amount: debt.amount })),
            }),
          ),
          ...preparedDebts.ingoingDebts.map(debt =>
            localize(user.locale, 'payments.notifications.saved.ingoingDebt', {
              name: renderUserMd(debt.debtor),
              amount: escapeMd(renderAmount(debt.amount)),
            }),
          ),
          ...(preparedDebts.outgoingDebts.length === 0 && preparedDebts.ingoingDebts.length === 0
            ? [localize(user.locale, 'payments.notifications.saved.checkDebts')]
            : []),
        ].join('\n'),
      }),
      {},
      { telegram },
    )
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
  { localize, usersStorage, telegram } = registry.export(),
) {
  const users = await usersStorage.find({ ids: [editorId, payment.fromUserId, payment.toUserId] })
  const editor = users.find(u => u.id === editorId)
  const sender = users.find(u => u.id === payment.fromUserId)
  const receiver = users.find(u => u.id === payment.toUserId)

  if (!editor || !sender || !receiver) return

  for (const user of deduplicateUsers([editor, sender, receiver])) {
    sendNotification(
      user.id,
      localize(user.locale, 'payments.notifications.deleted.message', {
        editor: renderUserMd(editor),
        sender: renderUserMd(sender),
        receiver: renderUserMd(receiver),
        amount: escapeMd(renderAmount(payment.amount)),
        description: payment.description
          ? localize(user.locale, 'payments.notifications.deleted.description', {
              description: escapeMd(payment.description),
            })
          : '',
      }),
      {},
      { telegram },
    )
  }
}

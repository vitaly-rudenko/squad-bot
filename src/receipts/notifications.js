import { Markup } from 'telegraf'
import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'
import { isDefined, renderAmount } from '../common/utils.js'
import { deduplicateUsers } from '../users/utils.js'
import { sendNotification } from '../common/notifications.js'
import { renderUserMd } from '../users/telegram.js'
import { aggregateDebts } from '../debts/utils.js'
import { generatePayCommand } from '../web-app/utils.js'
import { prepareDebtsForUser } from './utils.js'

/**
 * @param {{
 *   action: 'create' | 'update'
 *   editorId: string
 *   receipt: import('./types.js').Receipt
 *   debts: import('../debts/types').Debt[]
 * }} input
 * @param {import('../types').Deps<'localize' | 'usersStorage' | 'telegram' | 'generateWebAppUrl' | 'debtsStorage' | 'paymentsStorage'>} deps
 */
export async function sendReceiptSavedNotification(
  { action, editorId, receipt, debts },
  { localize, usersStorage, telegram, generateWebAppUrl, debtsStorage, paymentsStorage } = registry.export()
) {
  const debtorIds = debts.map(debt => debt.debtorId)
  const [editor, payer, ...debtors] = await usersStorage.findAndMapByIds([
    editorId,
    receipt.payerId,
    ...debtorIds,
  ])

  if (!editor || !payer) return

  const { ingoingDebts, outgoingDebts } = await aggregateDebts({
    userId: payer.id,
    debtsStorage,
    paymentsStorage,
  })

  const users = deduplicateUsers([editor, payer, ...debtors.filter(isDefined)])

  for (const user of users) {
    const part = debts.find(debt => debt.debtorId === user.id)
    const preparedDebts = prepareDebtsForUser({
      user,
      debtors: [payer, ...debtors.filter(isDefined)],
      ingoingDebts,
      outgoingDebts,
    })

    const message = localize(
      user.locale,
      'receipts.notifications.saved.message',
      {
        editor: renderUserMd(editor),
        payer: renderUserMd(payer),
        action: localize(user.locale, `receipts.notifications.saved.action.${action}`),
        amount: escapeMd(renderAmount(receipt.amount)),
        receiptUrl: escapeMd(generateWebAppUrl(`receipt-${receipt.id}`)),
        part: localize(
          user.locale,
          'receipts.notifications.part',
          { amount: escapeMd(renderAmount(part ? part.amount : 0)) },
        ),
        description: receipt.description
          ? localize(
            user.locale,
            'receipts.notifications.saved.description',
            { description: escapeMd(receipt.description) },
          )
          : '',
        debts: [
          ...preparedDebts.outgoingDebts.map(debt => localize(
            user.locale,
            'receipts.notifications.saved.outgoingDebt',
            {
              name: renderUserMd(debt.debtor),
              amount: escapeMd(renderAmount(debt.amount)),
              payUrl: generateWebAppUrl(generatePayCommand({ toUserId: debt.debtor.id, amount: debt.amount })),
            }
          )),
          ...preparedDebts.ingoingDebts.map(debt => localize(
            user.locale,
            'receipts.notifications.saved.ingoingDebt',
            {
              name: renderUserMd(debt.debtor),
              amount: escapeMd(renderAmount(debt.amount)),
            }
          )),
          ...preparedDebts.outgoingDebts.length === 0 && preparedDebts.ingoingDebts.length === 0
            ? [localize(user.locale, 'receipts.notifications.saved.checkDebts')]
            : []
        ].join('\n')
      }
    )

    sendNotification(
      user.id,
      message,
      receipt.photoFilename
        ? Markup.inlineKeyboard([
          Markup.button.callback(localize(user.locale, 'receipts.actions.getPhoto'), `photo:${receipt.photoFilename}`)
        ])
        : undefined,
      { telegram }
    )
  }
}

/**
 * @param {{
 *   editorId: string
 *   receipt: import('./types.js').Receipt
 *   debts: import('../debts/types').Debt[]
 * }} input
 * @param {import('../types').Deps<'localize' | 'usersStorage' | 'telegram'>} deps
 */
export async function sendReceiptDeletedNotification(
  { editorId, receipt, debts },
  { localize, usersStorage, telegram } = registry.export()
) {
  const [editor, payer, ...debtors] = await usersStorage.findAndMapByIds([
    editorId,
    receipt.payerId,
    ...debts.map(debt => debt.debtorId),
  ])

  if (!editor || !payer) return

  const users = deduplicateUsers([editor, payer, ...debtors.filter(isDefined)])

  for (const user of users) {
    const debt = debts.find(debt => debt.debtorId === user.id)

    sendNotification(user.id, localize(
      user.locale,
      'receipts.notifications.deleted.message',
      {
        editor: renderUserMd(editor),
        payer: renderUserMd(payer),
        amount: escapeMd(renderAmount(receipt.amount)),
        part: localize(
          user.locale,
          'receipts.notifications.part',
          { amount: escapeMd(renderAmount(debt ? debt.amount : 0)) },
        ),
        description: receipt.description
          ? localize(
            user.locale,
            'receipts.notifications.deleted.description',
            { description: escapeMd(receipt.description) },
          )
          : '',
      }
    ), {}, { telegram })
  }
}

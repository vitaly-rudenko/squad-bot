import { Markup } from 'telegraf'
import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'
import { isDefined, renderAmount } from '../common/utils.js'
import { deduplicateUsers } from '../users/utils.js'
import { sendNotification } from '../common/notifications.js'
import { renderUserMd } from '../users/telegram.js'

/**
 * @param {{
 *   action: 'create' | 'update'
 *   editorId: string
 *   receipt: import('./types.js').Receipt
 * }} input
 * @param {import('../types').Deps<'localize' | 'debtsStorage' | 'usersStorage' | 'telegram' | 'generateWebAppUrl'>} deps
 */
export async function sendReceiptSavedNotification(
  { action, editorId, receipt },
  { localize, debtsStorage, usersStorage, telegram, generateWebAppUrl } = registry.export()
) {
  const debts = await debtsStorage.findByReceiptId(receipt.id)

  const [editor, payer, ...debtors] = await usersStorage.findAndMapByIds([
    editorId,
    receipt.payerId,
    ...debts.map(debt => debt.debtorId),
  ])

  if (!editor || !payer) return

  const users = deduplicateUsers([editor, payer, ...debtors.filter(isDefined)])

  for (const user of users) {
    const debt = debts.find(debt => debt.debtorId === user.id)

    sendNotification(
      user.id,
      localize(
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
            'receipts.notifications.saved.part',
            { amount: escapeMd(renderAmount(debt ? debt.amount : 0)) },
          ),
          description: receipt.description
            ? localize(
              user.locale,
              'receipts.notifications.saved.description',
              { description: escapeMd(receipt.description) },
            )
            : '',
        }
      ),
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
 * }} input
 * @param {import('../types').Deps<'localize' | 'usersStorage' | 'telegram' | 'debtsStorage'>} deps
 */
export async function sendReceiptDeletedNotification(
  { editorId, receipt },
  { localize, usersStorage, telegram, debtsStorage } = registry.export()
) {
  const debts = await debtsStorage.findByReceiptId(receipt.id)
  const [editor, payer, ...debtors] = await usersStorage.findAndMapByIds([
    editorId,
    receipt.payerId,
    ...debts.map(debt => debt.debtorId),
  ])

  if (!editor || !payer) return

  const users = deduplicateUsers([editor, payer, ...debtors.filter(isDefined)])

  for (const user of users) {
    sendNotification(user.id, localize(
      user.locale,
      'receipts.notifications.deleted.message',
      {
        editor: renderUserMd(editor),
        payer: renderUserMd(payer),
        amount: escapeMd(renderAmount(receipt.amount)),
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

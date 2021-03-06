import { renderDebtAmount } from '../../debts/renderDebtAmount.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { renderMoney } from '../../utils/renderMoney.js'

export class ReceiptTelegramNotifier {
  constructor({ massTelegramNotificationFactory, usersStorage, debtsStorage, localize }) {
    this._usersStorage = usersStorage
    this._debtsStorage = debtsStorage
    this._massTelegramNotificationFactory = massTelegramNotificationFactory
    this._localize = localize
  }

  /** @param {import('../Receipt').Receipt} receipt */
  async deleted(receipt, { editorId }) {
    const { payerId, description, amount } = receipt
    const debts = await this._debtsStorage.findByReceiptId(receipt.id)

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    const massNotification = this._massTelegramNotificationFactory.create()

    for (const user of users) {
      if (!user.isComplete) continue

      const notification = this._localize(user.locale, 'notifications.receiptDeleted.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        receiptDescription: description
          ? this._localize(
            user.locale,
            'notifications.receiptDeleted.description',
            { description: escapeMd(description) },
          )
          : this._localize(user.locale, 'notifications.receiptDeleted.noDescription'),
        receiptAmount: escapeMd(renderMoney(amount)),
        payerName: escapeMd(payer.name),
        payerUsername: escapeMd(payer.username),
      })

      massNotification.add(user.id, notification)
    }

    return massNotification
  }
  
  /** @param {import('../Receipt').Receipt} receipt */
  async created(receipt, { editorId }) {
    return this._stored(receipt, { editorId, isNew: true })
  }

  /** @param {import('../Receipt').Receipt} receipt */
  async updated(receipt, { editorId }) {
    return this._stored(receipt, { editorId, isNew: false })
  }

  /** @param {import('../Receipt').Receipt} receipt */
  async _stored(receipt, { editorId, isNew }) {
    const { payerId, amount, description } = receipt
    const debts = await this._debtsStorage.findByReceiptId(receipt.id)

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    const massNotification = this._massTelegramNotificationFactory.create()

    for (const user of users) {
      if (!user.isComplete) continue

      const debt = debts.find(debt => debt.debtorId === user.id)
      const hideDebt = user.id === payerId || (!isNew && debt?.amount !== null)

      const notification = this._localize(user.locale, 'notifications.receiptStored.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        action: this._localize(
          user.locale,
          isNew
            ? 'notifications.receiptStored.actions.added'
            : 'notifications.receiptStored.actions.updated',
        ),
        receiptDescription: description
          ? this._localize(
            user.locale,
            'notifications.receiptStored.description',
            { description: escapeMd(description) },
          )
          : this._localize(user.locale, 'notifications.receiptStored.noDescription'),
        receiptAmount: escapeMd(renderMoney(amount)),
        payerName: escapeMd(payer.name),
        payerUsername: escapeMd(payer.username),
        debt: hideDebt ? '' : this._localize(
          user.locale,
          isNew
            ? 'notifications.receiptStored.debt.new'
            : 'notifications.receiptStored.debt.incomplete',
          { debtAmount: debt && escapeMd(renderDebtAmount(debt)) },
        )
      })

      massNotification.add(user.id, notification)
    }

    return massNotification
  }
}
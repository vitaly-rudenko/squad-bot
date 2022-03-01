import { renderDebtAmount } from '../../debts/renderDebtAmount.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { renderMoney } from '../../utils/renderMoney.js'

export class ReceiptTelegramNotifier {
  constructor({ telegramNotifier, usersStorage, localize, logger }) {
    this._usersStorage = usersStorage
    this._telegramNotifier = telegramNotifier
    this._localize = localize
    this._logger = logger
  }

  async receiptCreated(receipt, { editorId }) {
    await this._notify(receipt, { editorId, isNew: true })
  }

  async receiptUpdated(receipt, { editorId }) {
    await this._notify(receipt, { editorId, isNew: false })
  }

  async _notify(receipt, { editorId, isNew }) {
    const { payerId, amount, description, debts } = receipt

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    for (const user of users) {
      if (!user.isComplete) continue;
      const debt = debts.find(debt => debt.debtorId === user.id)
      const showDebt = (user.id !== payerId) && (isNew || debt?.amount === null)

      const notification = this._localize('notifications.receiptStored.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        action: this._localize(
          isNew
            ? 'notifications.receiptStored.actions.added'
            : 'notifications.receiptStored.actions.updated',
          {},
          user.locale
        ),
        receiptDescription: description
          ? this._localize(
            'notifications.receiptStored.description',
            { description: escapeMd(description) },
            user.locale
          )
          : this._localize('notifications.receiptStored.noDescription', {}, user.locale),
        receiptAmount: escapeMd(`${renderMoney(amount)} грн`),
        payerName: escapeMd(payer.name),
        payerUsername: escapeMd(payer.username),
        debt: showDebt
          ? this._localize(
            isNew
              ? 'notifications.receiptStored.debt.new'
              : 'notifications.receiptStored.debt.incomplete',
            { debtAmount: debt && escapeMd(renderDebtAmount(debt)) },
            user.locale
          )
          : ''
      }, user.locale)

      try {
        await this._telegramNotifier.notify(user.id, notification)
      } catch (error) {
        this._logger.error(error)
      }
    }
  }
}
import { renderDebtAmount } from '../../debts/renderDebtAmount.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { renderMoney } from '../../utils/renderMoney.js'

export class ReceiptTelegramNotifier {
  constructor({ telegramNotifier, usersStorage, debtsStorage, localize, logger }) {
    this._usersStorage = usersStorage
    this._debtsStorage = debtsStorage
    this._telegramNotifier = telegramNotifier
    this._localize = localize
    this._logger = logger
  }

  /** @param {import('../Receipt').Receipt} receipt */
  async deleted(receipt, { editorId }) {
    const { payerId, description, amount } = receipt
    const debts = await this._debtsStorage.findByReceiptId(receipt.id)

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    for (const user of users) {
      if (!user.isComplete) continue;

      const notification = this._localize(user.locale, 'notifications.receiptDeleted.message', {
        editorName: editor.name,
        editorUsername: editor.username,
        receiptDescription: description
          ? this._localize(
            user.locale,
            'notifications.receiptDeleted.description',
            { description: escapeMd(description) },
          )
          : this._localize(user.locale, 'notifications.receiptDeleted.noDescription'),
        receiptAmount: escapeMd(`${renderMoney(amount)} грн`),
        payerName: payer.name,
        payerUsername: payer.username,
      })

      try {
        await this._telegramNotifier.notify(user.id, notification)
      } catch (error) {
        this._logger.error(error)
      }
    }
  }
  
  /** @param {import('../Receipt').Receipt} receipt */
  async created(receipt, { editorId }) {
    await this._stored(receipt, { editorId, isNew: true })
  }

  /** @param {import('../Receipt').Receipt} receipt */
  async updated(receipt, { editorId }) {
    await this._stored(receipt, { editorId, isNew: false })
  }

  /** @param {import('../Receipt').Receipt} receipt */
  async _stored(receipt, { editorId, isNew }) {
    const { payerId, amount, description } = receipt
    const debts = await this._debtsStorage.findByReceiptId(receipt.id)

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    for (const user of users) {
      if (!user.isComplete) continue;
      const debt = debts.find(debt => debt.debtorId === user.id)
      const showDebt = (user.id !== payerId) && (isNew || debt?.amount === null)

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
        receiptAmount: escapeMd(`${renderMoney(amount)} грн`),
        payerName: escapeMd(payer.name),
        payerUsername: escapeMd(payer.username),
        ...showDebt && {
          debt: this._localize(
            user.locale,
            isNew
              ? 'notifications.receiptStored.debt.new'
              : 'notifications.receiptStored.debt.incomplete',
            { debtAmount: debt && escapeMd(renderDebtAmount(debt)) },
          )
        }
      })

      try {
        await this._telegramNotifier.notify(user.id, notification)
      } catch (error) {
        this._logger.error(error)
      }
    }
  }
}
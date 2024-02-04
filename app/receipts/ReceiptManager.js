import { Debt } from '../debts/Debt.js'

export class ReceiptManager {
  /**
   * @param {{
   *   receiptsStorage: import('./ReceiptsPostgresStorage.js').ReceiptsPostgresStorage,
   *   debtsStorage: import('../debts/DebtsPostgresStorage.js').DebtsPostgresStorage,
   *   receiptNotifier: import('./notifications/ReceiptTelegramNotifier.js').ReceiptTelegramNotifier,
   * }} input
   */
  constructor({ receiptsStorage, debtsStorage, receiptNotifier }) {
    this._receiptsStorage = receiptsStorage
    this._debtsStorage = debtsStorage
    this._receiptNotifier = receiptNotifier
  }

  /**
   * @param {{
   *   receipt: import('./Receipt').Receipt,
   *   receiptPhoto: import('./ReceiptPhoto').ReceiptPhoto | undefined | 'delete',
   *   debts: { debtorId: string, amount: number }[]
   * }} data
   * @param {{ editorId: string }} meta
   */
  async store({ receipt, receiptPhoto, debts }, { editorId }) {
    const isNew = !receipt.id

    let storedReceipt
    if (isNew) {
      storedReceipt = await this._receiptsStorage.create(receipt, receiptPhoto)
    } else {
      storedReceipt = await this._receiptsStorage.update(receipt, receiptPhoto)
      await this._debtsStorage.deleteByReceiptId(receipt.id)
    }

    for (const debt of debts) {
      await this._debtsStorage.create(
        new Debt({
          receiptId: storedReceipt.id,
          debtorId: debt.debtorId,
          amount: debt.amount,
        })
      )
    }

    const notification = isNew
      ? await this._receiptNotifier.created(storedReceipt, { editorId }).catch(() => undefined)
      : await this._receiptNotifier.updated(storedReceipt, { editorId }).catch(() => undefined)

    await notification?.send()

    return storedReceipt
  }

  async delete(receiptId, { editorId }) {
    const receipt = await this._receiptsStorage.findById(receiptId)
    const notification = await this._receiptNotifier.deleted(receipt, { editorId }).catch(() => undefined)

    await this._debtsStorage.deleteByReceiptId(receiptId)
    await this._receiptsStorage.deleteById(receiptId)

    await notification?.send()
  }
}

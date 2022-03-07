import { Debt } from '../debts/Debt.js'

export class ReceiptManager {
  constructor({ receiptsStorage, debtsStorage, receiptNotifier }) {
    this._receiptsStorage = receiptsStorage
    this._debtsStorage = debtsStorage
    this._receiptNotifier = receiptNotifier
  }

  /**
   * @param {object} data
   * @param {import('./Receipt').Receipt} data.receipt
   * @param {import('./ReceiptPhoto').ReceiptPhoto} data.receiptPhoto
   * @param {{ debtorId: string, amount: number }[]} data.debts
   * @param {object} meta
   * @param {string} meta.editorId
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

    if (isNew) {
      this._receiptNotifier.created(storedReceipt, { editorId })
    } else {
      this._receiptNotifier.updated(storedReceipt, { editorId })
    }

    return storedReceipt
  }

  async delete(receiptId, { editorId }) {
    const receipt = await this._receiptsStorage.findById(receiptId)

    await this._debtsStorage.deleteByReceiptId(receiptId)
    await this._receiptsStorage.deleteById(receiptId)

    await this._receiptNotifier.deleted(receipt, { editorId })
  }
}

export class Debt {
  /**
   * @param {{
   *   id?: string
   *   debtorId: string
   *   receiptId: string
   *   amount: number
   * }} input
   */
  constructor({ id, debtorId, receiptId, amount }) {
    this.id = id
    this.debtorId = debtorId
    this.receiptId = receiptId
    this.amount = amount
  }
}
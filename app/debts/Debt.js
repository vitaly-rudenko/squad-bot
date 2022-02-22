export class Debt {
  constructor({ id = undefined, debtorId, receiptId, amount }) {
    this.id = id
    this.debtorId = debtorId
    this.receiptId = receiptId
    this.amount = amount
  }
}
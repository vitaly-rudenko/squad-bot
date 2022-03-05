export class Receipt {
  constructor({ id = undefined, payerId, amount, description = null, hasPhoto = false, createdAt = new Date() }) {
    this.id = id
    this.payerId = payerId
    this.amount = amount
    this.description = description
    this.hasPhoto = hasPhoto
    this.createdAt = createdAt
  }
}

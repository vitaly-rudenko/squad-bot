export class Payment {
  constructor({ id = undefined, fromUserId, toUserId, amount, createdAt = new Date() }) {
    this.id = id
    this.fromUserId = fromUserId
    this.toUserId = toUserId
    this.amount = amount
    this.createdAt = createdAt
  }
}

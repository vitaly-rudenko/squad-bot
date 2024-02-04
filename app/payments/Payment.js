export class Payment {
  /**
   * @param {{
   *   id?: string
   *   fromUserId: string
   *   toUserId: string
   *   amount: number
   *   createdAt?: Date
   * }} input
   */
  constructor({ id, fromUserId, toUserId, amount, createdAt = new Date() }) {
    this.id = id
    this.fromUserId = fromUserId
    this.toUserId = toUserId
    this.amount = amount
    this.createdAt = createdAt
  }
}

export class AggregatedDebt {
  /**
   * @param {{
   *   fromUserId?: string
   *   toUserId?: string
   *   amount: number
   * }} input
   */
  constructor({ fromUserId, toUserId, amount }) {
    this.fromUserId = fromUserId
    this.toUserId = toUserId
    this.amount = amount
  }
}
export class AggregatedPayment {
  constructor({ fromUserId, toUserId, amount }) {
    this.fromUserId = fromUserId
    this.toUserId = toUserId
    this.amount = amount
  }
}

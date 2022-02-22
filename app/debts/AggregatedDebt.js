export class AggregatedDebt {
  constructor({ fromUserId = undefined, toUserId = undefined, amount, incompleteReceiptIds = [] }) {
    this.fromUserId = fromUserId
    this.toUserId = toUserId
    this.amount = amount
    this.incompleteReceiptIds = incompleteReceiptIds
  }

  isIncomplete() {
    return this.incompleteReceiptIds.length > 0
  }
}
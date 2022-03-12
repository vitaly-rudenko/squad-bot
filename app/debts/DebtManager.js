import { AggregatedDebt } from './AggregatedDebt.js'

export class DebtManager {
  constructor({ debtsStorage, paymentsStorage }) {
    this._debtsStorage = debtsStorage
    this._paymentsStorage = paymentsStorage
  }

  /**
   * @returns {Promise<{
   *   ingoingDebts: AggregatedDebt[],
   *   outgoingDebts: AggregatedDebt[],
   *   incompleteReceiptIds: string[],
   * }>}
   */
  async aggregateByUserId(userId) {
    const ingoingDebts = await this._debtsStorage.aggregateIngoingDebts(userId)
    const outgoingDebts = await this._debtsStorage.aggregateOutgoingDebts(userId)
    const ingoingPayments = await this._paymentsStorage.aggregateIngoingPayments(userId)
    const outgoingPayments = await this._paymentsStorage.aggregateOutgoingPayments(userId)

    const debtMap = {}
    const incompleteMap = {}
    const addPayment = (fromUserId, toUserId, amount) => {
      const debtUserId = fromUserId === userId ? toUserId : fromUserId

      if (!debtMap[debtUserId]) {
        debtMap[debtUserId] = 0
      }

      if (fromUserId === userId) {
        debtMap[debtUserId] -= amount
      } else {
        debtMap[debtUserId] += amount
      }
    }

    for (const debt of ingoingDebts) {
      addPayment(userId, debt.fromUserId, debt.amount)
      if (debt.incompleteReceiptIds.length > 0) {
        const key = debt.fromUserId + '_' + userId
        if (!incompleteMap[key]) incompleteMap[key] = new Set()
        incompleteMap[key].add(...debt.incompleteReceiptIds)
      }
    }

    for (const debt of outgoingDebts) {
      addPayment(debt.toUserId, userId, debt.amount)
      if (debt.incompleteReceiptIds.length > 0) {
        const key = userId + '_' + debt.toUserId
        if (!incompleteMap[key]) incompleteMap[key] = new Set()
        incompleteMap[key].add(...debt.incompleteReceiptIds)
      }
    }

    for (const payment of ingoingPayments)
      addPayment(payment.fromUserId, userId, payment.amount)
    for (const payment of outgoingPayments)
      addPayment(userId, payment.toUserId, payment.amount)

    const debts = []
    for (const [debtUserId, amount] of Object.entries(debtMap)) {
      const ingoingKey = debtUserId + '_' + userId
      const outgoingKey = userId + '_' + debtUserId

      if (amount !== 0) {
        const [fromUserId, toUserId] = amount > 0 ? [userId, debtUserId] : [debtUserId, userId]
        const key = fromUserId + '_' + toUserId

        debts.push(
          new AggregatedDebt({
            fromUserId,
            toUserId,
            amount: Math.abs(amount),
            incompleteReceiptIds: incompleteMap[key] ? [...incompleteMap[key]] : [],
          })
        )
      } else {
        if (incompleteMap[ingoingKey]) {
          debts.push(
            new AggregatedDebt({
              fromUserId: debtUserId,
              toUserId: userId,
              amount: 0,
              incompleteReceiptIds: [...incompleteMap[ingoingKey]],
            })
          )
        }

        if (incompleteMap[outgoingKey]) {
          debts.push(
            new AggregatedDebt({
              fromUserId: userId,
              toUserId: debtUserId,
              amount: 0,
              incompleteReceiptIds: [...incompleteMap[outgoingKey]],
            })
          )
        }
      }
    }

    return {
      ingoingDebts: debts.filter(debt => debt.toUserId === userId),
      outgoingDebts: debts.filter(debt => debt.fromUserId === userId),
      incompleteReceiptIds: [...new Set([
        ...ingoingDebts.flatMap(d => d.incompleteReceiptIds),
        ...outgoingDebts.flatMap(d => d.incompleteReceiptIds),
      ])],
    }
  }
}

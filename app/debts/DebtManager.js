import { AggregatedDebt } from './AggregatedDebt.js'

export class DebtManager {
  /**
   * @param {{
   *   debtsStorage: import('./DebtsPostgresStorage.js').DebtsPostgresStorage,
   *   paymentsStorage: import('../payments/PaymentsPostgresStorage.js').PaymentsPostgresStorage,
   * }} input
   */
  constructor({ debtsStorage, paymentsStorage }) {
    this._debtsStorage = debtsStorage
    this._paymentsStorage = paymentsStorage
  }

  /**
   * @param {string} userId
   * @returns {Promise<{
   *   ingoingDebts: AggregatedDebt[],
   *   outgoingDebts: AggregatedDebt[],
   * }>}
   */
  async aggregateByUserId(userId) {
    const ingoingDebts = await this._debtsStorage.aggregateIngoingDebts(userId)
    const outgoingDebts = await this._debtsStorage.aggregateOutgoingDebts(userId)
    const ingoingPayments = await this._paymentsStorage.aggregateIngoingPayments(userId)
    const outgoingPayments = await this._paymentsStorage.aggregateOutgoingPayments(userId)

    const debtMap = {}
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
    }

    for (const debt of outgoingDebts) {
      addPayment(debt.toUserId, userId, debt.amount)
    }

    for (const payment of ingoingPayments) {
      addPayment(payment.fromUserId, userId, payment.amount)
    }

    for (const payment of outgoingPayments) {
      addPayment(userId, payment.toUserId, payment.amount)
    }

    const debts = []
    for (const [debtUserId, amount] of Object.entries(debtMap)) {
      if (amount !== 0) {
        const [fromUserId, toUserId] = amount > 0 ? [userId, debtUserId] : [debtUserId, userId]

        debts.push(
          new AggregatedDebt({
            fromUserId,
            toUserId,
            amount: Math.abs(amount),
          })
        )
      }
    }

    return {
      ingoingDebts: debts.filter(debt => debt.toUserId === userId),
      outgoingDebts: debts.filter(debt => debt.fromUserId === userId),
    }
  }
}

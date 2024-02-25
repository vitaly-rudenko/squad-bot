/**
 * @param {{
 *   userId: string
 *   debtsStorage: import('./storage.js').DebtsPostgresStorage,
 *   paymentsStorage: import('../payments/storage.js').PaymentsPostgresStorage,
 * }} input
 */
export async function aggregateDebts({
  userId,
  debtsStorage,
  paymentsStorage,
}) {
  const ingoingDebts = await debtsStorage.aggregateDebts({ toUserId: userId })
  const outgoingDebts = await debtsStorage.aggregateDebts({ fromUserId: userId })
  const ingoingPayments = await paymentsStorage.aggregatePayments({ toUserId: userId })
  const outgoingPayments = await paymentsStorage.aggregatePayments({ fromUserId: userId })

  /** @type {Record<string, number | undefined>} */
  const debtMap = {}

  /**
   * @param {string} fromUserId
   * @param {string} toUserId
   * @param {number} amount
   */
  const addPayment = (fromUserId, toUserId, amount) => {
    const debtUserId = fromUserId === userId ? toUserId : fromUserId

    if (fromUserId === userId) {
      debtMap[debtUserId] = (debtMap[debtUserId] ?? 0) - amount
    } else {
      debtMap[debtUserId] = (debtMap[debtUserId] ?? 0) + amount
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

  /** @type {import('./types').AggregatedDebt[]} */
  const debts = []
  for (const [debtUserId, amount] of Object.entries(debtMap)) {
    if (amount !== undefined && amount !== 0) {
      const [fromUserId, toUserId] = amount > 0 ? [userId, debtUserId] : [debtUserId, userId]

      debts.push({ fromUserId, toUserId, amount: Math.abs(amount) })
    }
  }

  return {
    ingoingDebts: debts.filter(debt => debt.toUserId === userId),
    outgoingDebts: debts.filter(debt => debt.fromUserId === userId),
  }
}

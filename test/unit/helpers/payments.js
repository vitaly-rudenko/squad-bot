export class PaymentsMockStorage {
  constructor() {
    this._payments = new Set()
  }

  /** @param {import('../../../src/payments/types').Payment[]} payments */
  mock_storePayments(...payments) {
    for (const payment of payments) {
      this._payments.add(payment)
    }
  }

  /** @param {string} receiptId */
  findByReceiptId(receiptId) {
    return [...this._payments].filter(d => d.receiptId === receiptId)
  }

  aggregatePayments() {
    return []
  }
}

/**
 * @param {T[]} payments
 * @returns {import('../../../src/payments/storage.js').PaymentsPostgresStorage}
 * @template {import('../../../src/payments/types').Payment} T
 */
export function createPaymentsStorage(payments) {
  const paymentsStorage = new PaymentsMockStorage()
  paymentsStorage.mock_storePayments(...payments)
  // @ts-ignore
  return paymentsStorage
}

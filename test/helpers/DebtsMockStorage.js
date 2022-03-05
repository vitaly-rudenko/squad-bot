export class DebtsMockStorage {
  constructor() {
    this._debts = new Set()
  }

  mock_storeDebts(...debts) {
    for (const debt of debts) {
      this._debts.add(debt)
    }
  }

  findByReceiptId(receiptId) {
    return [...this._debts].filter(d => d.receiptId === receiptId)
  }
}

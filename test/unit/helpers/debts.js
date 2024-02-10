import { Chance } from 'chance'

const chance = new Chance()

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

/**
 * @param {T[]} debts
 * @returns {import('../../../app/features/debts/storage.js').DebtsPostgresStorage}
 * @template {import('../../../app/features/debts/types').Debt} T
 */
export function createDebtsStorage(debts) {
  const debtsStorage = new DebtsMockStorage()
  debtsStorage.mock_storeDebts(...debts)
  // @ts-ignore
  return debtsStorage
}

/**
 * @param {Partial<import('../../../app/features/debts/types').Debt>} debt
 * @returns {import('../../../app/features/debts/types').Debt}
 */
export function createDebt(debt) {
  return {
    id: chance.guid(),
    amount: chance.integer({ min: 1, max: 1000 }),
    debtorId: chance.guid(),
    receiptId: chance.guid(),
    ...debt,
  }
}


/**
 * @param {{
 *   user: import('../users/types').User
 *   debtors: import('../users/types').User[]
 *   ingoingDebts: import('../debts/types').AggregatedDebt[]
 *   outgoingDebts: import('../debts/types').AggregatedDebt[]
 * }} input
 */
export function prepareDebtsForUser({ user, debtors, ingoingDebts, outgoingDebts }) {
  const ingoingDebtsForUser = [
    ...ingoingDebts.filter(debt => debt.toUserId === user.id)
      .map(debt => ({ debtorId: debt.fromUserId, amount: debt.amount })),
    ...outgoingDebts.filter(debt => debt.toUserId === user.id)
      .map(debt => ({ debtorId: debt.fromUserId, amount: debt.amount })),
  ]

  const outgoingDebtsForUser = [
    ...ingoingDebts.filter(debt => debt.fromUserId === user.id)
      .map(debt => ({ debtorId: debt.toUserId, amount: debt.amount })),
    ...outgoingDebts.filter(debt => debt.fromUserId === user.id)
      .map(debt => ({ debtorId: debt.toUserId, amount: debt.amount })),
  ]

  return {
    ingoingDebts: ingoingDebtsForUser
      .map(debt => ({
        debtor: debtors.find(debtor => debt.debtorId === debtor.id),
        amount: debt.amount,
      }))
      .filter(isDebtorDefined),
    outgoingDebts: outgoingDebtsForUser
      .map(debt => ({
        debtor: debtors.find(debtor => debt.debtorId === debtor.id),
        amount: debt.amount,
      }))
      .filter(isDebtorDefined),
  }
}

/**
 * @param {Partial<T>} debt
 * @returns {debt is T}
 * @template {{ debtor: import('../users/types').User }} T
 */
function isDebtorDefined(debt) {
  return debt.debtor !== undefined
}

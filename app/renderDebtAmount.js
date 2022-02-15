import { renderMoney } from './renderMoney.js'

export function renderDebtAmount(debt) {
  let amount = debt.amount !== null && debt.amount > 0 ? renderMoney(debt.amount) : ''

  if (debt.amount === null || debt.isUncertain) {
    amount = amount ? amount + '+?' : '?'
  }

  return amount
}

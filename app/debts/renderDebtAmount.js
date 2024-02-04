import { renderAmount, renderMoney } from '../utils/renderMoney.js'

/** @param {import('./Debt.js').Debt} debt */
export function renderDebtAmount(debt) {
  return renderMoney(debt.amount)
}

/** @param {import('./AggregatedDebt').AggregatedDebt} debt */
export function renderAggregatedDebt(debt) {
  return renderMoney(debt.amount)
}

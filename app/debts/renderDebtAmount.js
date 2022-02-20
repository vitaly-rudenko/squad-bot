import { renderMoney } from '../utils/renderMoney.js'

/** @param {import('./Debt').Debt} debt */
export function renderDebtAmount(debt) {
  return `${debt.amount !== null ? renderMoney(debt.amount) : '?'} грн`
}

/** @param {import('./AggregatedDebt').AggregatedDebt} debt */
export function renderAggregatedDebt(debt) {
  return `${debt.isIncomplete() ? (debt.amount === 0 ? '?' : `${debt.amount}+?`) : debt.amount} грн`
}

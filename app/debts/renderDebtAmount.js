import { renderAmount, renderMoney } from '../utils/renderMoney.js'

/** @param {import('./Debt').Debt} debt */
export function renderDebtAmount(debt) {
  return renderMoney(debt.amount === null ? '?' : debt.amount)
}

/** @param {import('./AggregatedDebt').AggregatedDebt} debt */
export function renderAggregatedDebt(debt) {
  return renderMoney(
    debt.isIncomplete()
      ? (debt.amount === 0 ? '?': `${renderAmount(debt.amount)}+?`)
      : debt.amount
  )
}

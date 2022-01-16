import { renderMoney } from './renderMoney.js'

export function renderDebts(debts) {
  return debts
    .map(debt => renderDebt(debt))
    .join('\n')
}

function renderDebt(debt) {
  const name = debt.type === 'external' ? ('*' + debt.name) : debt.name
  const comment = debt.comment ? (' ' + debt.comment) : ''

  if (debt.paid === 0 && debt.amount === null) {
    return `${name}: ?${comment}`
  }

  const paid = renderMoney(debt.paid)
  const amount = debt.amount !== null ? renderMoney(debt.amount) : '?'

  return `${name}: ${paid} / ${amount}${comment}`
}


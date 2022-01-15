export function renderDebts(debts) {
  return debts
    .map(debt => renderDebt(debt))
    .join('\n')
}

function renderDebt(debt) {
  const name = debt.type === 'external' ? ('*' + debt.name) : debt.name
  const paid = renderMoney(debt.paid)
  const amount = debt.amount !== null ? renderMoney(debt.amount) : '?'
  const comment = debt.comment ? (' ' + debt.comment) : ''

  return `${name}: ${paid} / ${amount}${comment}`
}

function renderMoney(money) {
  return money.toFixed(2).endsWith('00')
    ? money.toFixed(0)
    : money.toFixed(2).endsWith('0')
      ? money.toFixed(1)
      : money.toFixed(2)
}

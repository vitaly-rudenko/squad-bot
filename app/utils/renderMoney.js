export function renderAmount(amount) {
  amount = amount / 100

  return amount.toFixed(2).endsWith('00')
    ? amount.toFixed(0)
    : amount.toFixed(2)
}

export function renderMoney(amount, currency = 'UAH') {
  if (currency !== 'UAH') throw new Error('Unsupported currency')
  return `${typeof amount === 'number' ? renderAmount(amount) : amount} грн`
}

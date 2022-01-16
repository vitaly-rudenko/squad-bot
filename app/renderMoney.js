export function renderMoney(money) {
  return money.toFixed(2).endsWith('00')
    ? money.toFixed(0)
    : money.toFixed(2)
}

export function renderMoney(money) {
  money = money / 100

  return money.toFixed(2).endsWith('00')
    ? money.toFixed(0)
    : money.toFixed(2)
}

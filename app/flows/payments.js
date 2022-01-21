export function paymentsGetCommand() {
  return async (context) => {
    await context.reply(`
Добавить платеж можно здесь:
https://groupsquadbot.herokuapp.com/paymentview

Посмотреть платежи можно здесь:
https://groupsquadbot.herokuapp.com/paymentslist
`)
  }
}

export function receiptsGetCommand() {
  return async (context) => {
    await context.reply(`
Добавить чек можно здесь:
https://groupsquadbot.herokuapp.com/

Посмотреть чеки можно здесь:
https://groupsquadbot.herokuapp.com/receiptslist
`)
  }
}

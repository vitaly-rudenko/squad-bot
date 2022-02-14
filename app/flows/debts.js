import { renderDebtAmount } from '../renderDebtAmount.js'
import { renderMoney } from '../renderMoney.js'

export function debtsCommand({ storage, getDebtsByUserId }) {
  return async (context) => {
    const userId = context.state.userId
    const users = await storage.findUsers()

    const { ingoingDebts, outgoingDebts, unfinishedReceiptIds } = await getDebtsByUserId(userId)
    const unfinishedReceipts = await storage.findReceiptsByIds(unfinishedReceiptIds ?? [])
    const unfinishedReceiptsByMe = unfinishedReceipts
      .filter(r => r.debts.some(d => d.amount === null && d.debtorId === userId && d.debtorId !== r.payerId))

    function getUserName(id) {
      const user = users.find(u => u.id === id)
      return user ? user.name : `??? (${id})`
    }

    function renderDebt(debt) {
      return `- ${getUserName(debt.userId)}: ${renderDebtAmount(debt)} грн`
    }

    function renderUnfinishedReceipt(receipt, index) {
      return `
${index}. ${getUserName(receipt.payerId)}: ${renderMoney(receipt.amount)} грн
    → 📅 ${[receipt.createdAt.toISOString().split('T')[0].replaceAll('-', '.'), receipt.description, receipt.hasPhoto && 'с фото'].filter(Boolean).join(', ')}
      `.trim()
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0 ? `\
🙂 Тебе должны:
${
  ingoingDebts
    .map(renderDebt)
    .join('\n')
}` : 'Тебе никто ничего не должен 🙁'

    const outgoingDebtsFormatted = outgoingDebts.length > 0 ? `\
🙁 Ты должен:
${
  outgoingDebts
    .map(renderDebt)
    .join('\n')
}` : 'Ты никому ничего не должен 🙂'

    const unfinishedReceiptsFormatted = unfinishedReceiptsByMe.length > 0 && `\
❗️ Ты не заполнил эти чеки (/receipts):
${unfinishedReceiptsByMe
  .map((r, i) => renderUnfinishedReceipt(r, i + 1)).join('\n')}   
`
// TODO: show your receipts that haven't been filled by someone else

    const isIncomplete = !context.state.user.isComplete && '💡 Чтобы получать уведомления о платежах и новых чеках, выполни команду /start в ЛС бота.'

    const message = await context.reply([outgoingDebtsFormatted, ingoingDebtsFormatted, unfinishedReceiptsFormatted, isIncomplete].filter(Boolean).map(s => s.trim()).join('\n\n'))

    if (context.chat.type !== 'private') {
      setTimeout(async () => {
        await Promise.all([
          context.deleteMessage(context.message.message_id).catch(() => {}),
          context.deleteMessage(message.message_id).catch(() => {}),
        ])
      }, 60_000)
    }
  }
}

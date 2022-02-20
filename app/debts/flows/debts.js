import { renderAggregatedDebt as renderAggregatedDebtAmount, renderDebtAmount } from '../renderDebtAmount.js'
import { renderMoney } from '../../utils/renderMoney.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function debtsCommand({ storage, usersStorage, aggregateDebtsByUserId }) {
  return async (context) => {
    const userId = context.state.userId
    const users = await usersStorage.findAll()

    const { ingoingDebts, outgoingDebts, incompleteReceiptIds } = await aggregateDebtsByUserId(userId)
    const incompleteReceipts = await storage.findReceiptsByIds(incompleteReceiptIds ?? [])
    const incompleteReceiptsByMe = incompleteReceipts
      .filter(receipt => receipt.debts.some(debt => debt.amount === null && debt.debtorId === userId && debt.debtorId !== receipt.payerId))

    function getUserName(id) {
      const user = users.find(u => u.id === id)
      return user ? user.name : `??? (${id})`
    }

    function renderAggregatedDebt(debt) {
      return context.state.localize('command.debts.debt', {
        name: escapeMd(getUserName(debt.fromUserId === userId ? debt.toUserId : debt.fromUserId)),
        amount: renderAggregatedDebtAmount(debt),
      })
    }

    function renderIncompleteReceipt(receipt, index) {
      return `
${index}. ${getUserName(receipt.payerId)}: ${renderMoney(receipt.amount)} грн
    → 📅 ${[receipt.createdAt.toISOString().split('T')[0].replaceAll('-', '.'), receipt.description, receipt.hasPhoto && 'с фото'].filter(Boolean).join(', ')}
      `.trim()
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0 ? `\
🙂 Тебе должны:
${
  ingoingDebts
    .map(renderAggregatedDebt)
    .join('\n')
}` : 'Тебе никто ничего не должен 🙁'

    const outgoingDebtsFormatted = outgoingDebts.length > 0 ? `\
🙁 Ты должен:
${
  outgoingDebts
    .map(renderAggregatedDebt)
    .join('\n')
}` : 'Ты никому ничего не должен 🙂'

    const incompletesReceiptsFormatted = incompleteReceiptsByMe.length > 0 && `\
❗️ Ты не заполнил эти чеки (/receipts):
${incompleteReceiptsByMe
  .map((r, i) => renderIncompleteReceipt(r, i + 1)).join('\n')}   
`
// TODO: show your receipts that haven't been filled by someone else

    const isIncomplete = !context.state.user.isComplete && '💡 Чтобы получать уведомления о платежах и новых чеках, выполни команду /start в ЛС бота.'

    const message = await context.reply([outgoingDebtsFormatted, ingoingDebtsFormatted, incompletesReceiptsFormatted, isIncomplete].filter(Boolean).map(s => s.trim()).join('\n\n'))

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

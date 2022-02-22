import { renderAggregatedDebt } from '../renderDebtAmount.js'
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
      return users.find(u => u.id === id)?.name ?? id
    }

    function localizeAggregatedDebt(debt) {
      return context.state.localize('command.debts.debt', {
        name: escapeMd(getUserName(debt.fromUserId === userId ? debt.toUserId : debt.fromUserId)),
        amount: escapeMd(renderAggregatedDebt(debt)),
      })
    }

    function localizeIncompleteReceipt(receipt, index) {
      return context.state.localize('command.debts.incompleteReceipt', {
        index,
        name: escapeMd(getUserName(receipt.payerId)),
        amount: escapeMd(`${renderMoney(receipt.amount)} грн`),
        createdAt: escapeMd(receipt.createdAt.toISOString().split('T')[0].replaceAll('-', '.')),
        description: escapeMd(receipt.description || context.state.localize('command.debts.noDescription')),
        photo: receipt.hasPhoto
          ? context.state.localize('command.debts.withPhoto')
          : context.state.localize('command.debts.withoutPhoto'),
        receiptUrl: escapeMd(`${process.env.DOMAIN}/?receipt_id=${receipt.id}`)
      })
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0
      ? context.state.localize('command.debts.ingoingDebts', { 
        debts: ingoingDebts.map(localizeAggregatedDebt).join('\n')
      })
      : context.state.localize('command.debts.noIngoingDebts')

    const outgoingDebtsFormatted = outgoingDebts.length > 0
      ? context.state.localize('command.debts.outgoingDebts', {
        debts: outgoingDebts.map(localizeAggregatedDebt).join('\n')
      })
      : context.state.localize('command.debts.noOutgoingDebts')


    const incompleteReceiptsFormatted = incompleteReceiptsByMe.length > 0
      && context.state.localize('command.debts.incompleteReceipts', {
        incompleteReceipts: incompleteReceiptsByMe
          .map((receipt, i) => localizeIncompleteReceipt(receipt, i + 1))
          .join('\n')
      })

    const isIncomplete = !context.state.user.isComplete
      && context.state.localize('command.debts.incompleteUser')

    const message = await context.reply(
      [
        outgoingDebtsFormatted,
        ingoingDebtsFormatted,
        incompleteReceiptsFormatted,
        isIncomplete
      ].filter(Boolean).map(s => s.trim()).join('\n\n'),
      { parse_mode: 'MarkdownV2' }
    )

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

import { renderAggregatedDebt } from '../renderDebtAmount.js'
import { renderMoney } from '../../utils/renderMoney.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function debtsCommand({ receiptsStorage, usersStorage, debtsStorage, debtManager }) {
  return async (context) => {
    const { userId, localize } = context.state
    const users = await usersStorage.findAll()
    const user = await usersStorage.findById(userId)

    const { ingoingDebts, outgoingDebts, incompleteReceiptIds } = await debtManager.aggregateByUserId(userId)
    const incompleteReceipts = await receiptsStorage.findByIds(incompleteReceiptIds ?? [])
    const incompleteReceiptDebts = await debtsStorage.findByReceiptIds(incompleteReceiptIds)
    const incompleteReceiptsByMe = incompleteReceipts
      .filter(receipt => incompleteReceiptDebts.some(debt =>
        debt.receiptId === receipt.id &&
        debt.amount === null &&
        debt.debtorId === userId
      ))

    function getUserName(id) {
      return users.find(u => u.id === id)?.name ?? id
    }

    function localizeAggregatedDebt(debt) {
      return localize('command.debts.debt', {
        name: escapeMd(getUserName(debt.fromUserId === userId ? debt.toUserId : debt.fromUserId)),
        amount: escapeMd(renderAggregatedDebt(debt)),
      })
    }

    function localizeIncompleteReceipt(receipt, index) {
      return localize('command.debts.incompleteReceipt', {
        index,
        name: escapeMd(getUserName(receipt.payerId)),
        amount: escapeMd(renderMoney(receipt.amount)),
        createdAt: escapeMd(receipt.createdAt.toISOString().split('T')[0].replaceAll('-', '.')),
        description: escapeMd(receipt.description || localize('command.debts.noDescription')),
        photo: receipt.hasPhoto
          ? localize('command.debts.withPhoto')
          : localize('command.debts.withoutPhoto'),
        receiptUrl: escapeMd(`${process.env.DOMAIN}/?receipt_id=${receipt.id}`)
      })
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0
      ? localize('command.debts.ingoingDebts', {
        debts: ingoingDebts.map(localizeAggregatedDebt).join('\n')
      })
      : localize('command.debts.noIngoingDebts')

    const outgoingDebtsFormatted = outgoingDebts.length > 0
      ? localize('command.debts.outgoingDebts', {
        debts: outgoingDebts.map(localizeAggregatedDebt).join('\n')
      })
      : localize('command.debts.noOutgoingDebts')


    const incompleteReceiptsFormatted = incompleteReceiptsByMe.length > 0
      && localize('command.debts.incompleteReceipts', {
        incompleteReceipts: incompleteReceiptsByMe
          .map((receipt, i) => localizeIncompleteReceipt(receipt, i + 1))
          .join('\n')
      })

    const isIncomplete = !user.isComplete && localize('command.debts.incompleteUser')

    await context.reply(
      [
        outgoingDebtsFormatted,
        ingoingDebtsFormatted,
        incompleteReceiptsFormatted,
        isIncomplete
      ].filter(Boolean).map(s => s.trim()).join('\n\n'),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

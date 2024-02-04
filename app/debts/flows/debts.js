import { renderAggregatedDebt } from '../renderDebtAmount.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function debtsCommand({ usersStorage, debtManager }) {
  return async (context) => {
    const { userId, localize } = context.state
    const users = await usersStorage.findAll()
    const user = await usersStorage.findById(userId)

    const { ingoingDebts, outgoingDebts } = await debtManager.aggregateByUserId(userId)

    function getUserName(id) {
      return users.find(u => u.id === id)?.name ?? id
    }

    function localizeAggregatedDebt(debt) {
      return localize('command.debts.debt', {
        name: escapeMd(getUserName(debt.fromUserId === userId ? debt.toUserId : debt.fromUserId)),
        amount: escapeMd(renderAggregatedDebt(debt)),
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

    const isIncomplete = !user.isComplete && localize('command.debts.incompleteUser')

    await context.reply(
      [
        outgoingDebtsFormatted,
        ingoingDebtsFormatted,
        isIncomplete
      ].filter(Boolean).map(s => s.trim()).join('\n\n'),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

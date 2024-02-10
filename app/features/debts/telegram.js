import { registry } from '../../registry.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { aggregateDebts, renderAggregatedDebt } from './utils.js'

export function createDebtsFlow() {
  const { usersStorage, debtsStorage, paymentsStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const debts = async (context) => {
    const { userId, locale } = context.state
    const user = await usersStorage.findById(userId)
    if (!user) return

    const { ingoingDebts, outgoingDebts } = await aggregateDebts({
      userId,
      debtsStorage,
      paymentsStorage,
    })

    const userIds = [...new Set([
      ...ingoingDebts.flatMap(d => [d.fromUserId, d.toUserId]),
      ...outgoingDebts.flatMap(d => [d.fromUserId, d.toUserId]),
    ])]

    const users = await usersStorage.findByIds(userIds)

    /** @param {import('./types').AggregatedDebt} debt */
    function localizeAggregatedDebt(debt) {
      const debtorId = debt.fromUserId === userId ? debt.toUserId : debt.fromUserId
      const name = users.find(u => u.id === debtorId)?.name ?? debtorId

      return localize(locale, 'debts.command.debt', {
        name: escapeMd(name),
        amount: escapeMd(renderAggregatedDebt(debt)),
      })
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0
      ? localize(locale, 'debts.command.ingoingDebts', {
        debts: ingoingDebts.map(localizeAggregatedDebt).join('\n')
      })
      : localize(locale, 'debts.command.noIngoingDebts')

    const outgoingDebtsFormatted = outgoingDebts.length > 0
      ? localize(locale, 'debts.command.outgoingDebts', {
        debts: outgoingDebts.map(localizeAggregatedDebt).join('\n')
      })
      : localize(locale, 'debts.command.noOutgoingDebts')

    await context.reply(
      [
        outgoingDebtsFormatted,
        ingoingDebtsFormatted,
      ].filter(Boolean).map(s => s.trim()).join('\n\n'),
      { parse_mode: 'MarkdownV2' }
    )
  }

  return { debts }
}

import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'
import { renderUser } from '../common/utils.js'
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
    function debtReplacements(debt) {
      const debtorId = debt.fromUserId === userId ? debt.toUserId : debt.fromUserId
      const debtor = users.find(u => u.id === debtorId)

      return {
        debtor: escapeMd(debtor ? renderUser(debtor) : localize(locale, 'unknownUser')),
        amount: escapeMd(renderAggregatedDebt(debt)),
      }
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0
      ? ingoingDebts.length === 1
        ? localize(locale, 'debts.command.ingoingDebt', debtReplacements(ingoingDebts[0]))
        : localize(locale, 'debts.command.ingoingDebts', {
          debts: ingoingDebts
            .map(debt => localize(locale, 'debts.command.debt', debtReplacements(debt)))
            .join('\n')
        })
      : localize(locale, 'debts.command.noIngoingDebts')

    const outgoingDebtsFormatted = outgoingDebts.length > 0
      ? outgoingDebts.length === 1
        ? localize(locale, 'debts.command.outgoingDebt', debtReplacements(outgoingDebts[0]))
        : localize(locale, 'debts.command.outgoingDebts', {
          debts: outgoingDebts
            .map(debt => localize(locale, 'debts.command.debt', debtReplacements(debt)))
            .join('\n')
        })
      : localize(locale, 'debts.command.noOutgoingDebts')

    await context.reply(
      [
        outgoingDebtsFormatted,
        ingoingDebtsFormatted,
        localize(locale, 'debts.command.footer'),
      ].filter(Boolean).map(s => s.trim()).join('\n\n'),
      { parse_mode: 'MarkdownV2' }
    )
  }

  return { debts }
}
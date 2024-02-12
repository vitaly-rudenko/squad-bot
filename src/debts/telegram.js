import { registry } from '../registry.js'
import { escapeMd } from '../common/telegram.js'
import { aggregateDebts, renderAggregatedDebt } from './utils.js'
import { renderUserMd } from '../users/telegram.js'
import { isDefined } from '../common/utils.js'

export function createDebtsFlow() {
  const { usersStorage, debtsStorage, paymentsStorage, localize, generateWebAppUrl } = registry.export()

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
        name: debtor ? renderUserMd(debtor) : escapeMd(localize(locale, 'unknownUser')),
        amount: escapeMd(renderAggregatedDebt(debt)),
        payUrl: generateWebAppUrl(`pay-${debtorId}-${debt.amount}`),
      }
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0
      ? ingoingDebts.length === 1
        ? localize(locale, 'debts.command.ingoingDebtsOne', debtReplacements(ingoingDebts[0]))
        : localize(locale, 'debts.command.ingoingDebtsMany', {
          debts: ingoingDebts
            .map(debt => localize(locale, 'debts.command.ingoingDebt', debtReplacements(debt)))
            .join('\n')
        })
      : undefined

    const outgoingDebtsFormatted = outgoingDebts.length > 0
      ? outgoingDebts.length === 1
        ? localize(locale, 'debts.command.outgoingDebtsOne', debtReplacements(outgoingDebts[0]))
        : localize(locale, 'debts.command.outgoingDebtsMany', {
          debts: outgoingDebts
            .map(debt => localize(locale, 'debts.command.outgoingDebt', debtReplacements(debt)))
            .join('\n')
        })
      : undefined

    const noDebts = ingoingDebts.length === 0 && outgoingDebts.length === 0
      ? localize(locale, 'debts.command.noDebts')
      : undefined

    await context.reply(
      [
        outgoingDebtsFormatted,
        ingoingDebtsFormatted,
        noDebts,
      ].filter(isDefined).map(s => s.trim()).join('\n\n'),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    )
  }

  return { debts }
}

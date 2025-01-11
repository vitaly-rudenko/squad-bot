import { stringify } from 'csv-stringify/sync'
import { MAX_DEBTS_PER_RECEIPT } from '../debts/constants.js'
import { registry } from '../registry.js'
import { unique } from '../common/utils.js'

// TODO: export payments
// TODO: export cards
// TODO: export groups (roll calls and titles)

/** Not an exact amount, an estimation */
const MAX_EXPORT_ROWS = 10_000

/** Not an exact amount, an estimation */
const MAX_EXPORT_COLUMNS = 1_000

export function createExportFlow() {
  const { receiptsStorage, debtsStorage, usersStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const exportReceiptsCsv = async (context) => {
    const { userId, locale } = context.state

    const { items: receipts } = await receiptsStorage.find({
      limit: MAX_EXPORT_ROWS,
      participantUserIds: [userId],
    })

    if (receipts.length === 0) {
      await context.reply(localize(locale, 'export.receipts.command.noReceipts'))
      return
    }

    const debts = await debtsStorage.find({
      receiptIds: receipts.map(r => r.id),
      limit: receipts.length * MAX_DEBTS_PER_RECEIPT,
    })

    const userIds = unique([userId, ...receipts.map(r => r.payerId), ...debts.map(d => d.debtorId)])

    const unsortedUsers = await usersStorage.find({ ids: userIds, limit: MAX_EXPORT_COLUMNS })
    const users = userIds.map(userId => {
      const user = unsortedUsers.find(u => u.id === userId)
      if (!user) throw new Error(`Could not find User by userId: ${userId}`)
      return user
    })

    /** @param {string} userId */
    function renderUser(userId) {
      const user = users.find(u => u.id === userId)
      if (!user) throw new Error(`Could not render User by userId: ${userId}`)

      return user.username
        ? `${user.name} (@${user.username})`
        : user.name
    }

    /** @param {Date} date */
    function formatDate(date) {
      return date.toISOString().replace('T', ' ').split('.')[0]
    }

    /** @type {string[][]} */
    const rows = [
      [
        localize(locale, 'export.receipts.columns.date'),
        localize(locale, 'export.receipts.columns.description'),
        localize(locale, 'export.receipts.columns.amount'),
        localize(locale, 'export.receipts.columns.payer'),
        ...users.map(user => renderUser(user.id))
      ],
    ]

    for (const receipt of receipts) {
      const receiptDebts = debts.filter(debt => debt.receiptId === receipt.id)

      rows.push([
        formatDate(receipt.createdAt),
        receipt.description ?? '',
        (receipt.amount / 100).toFixed(2),
        renderUser(receipt.payerId),
        ...users.map(user => {
          const debt = receiptDebts.find(d => d.debtorId === user.id)
          return debt ? (debt.amount / 100).toFixed(2) : ''
        })
      ])
    }

    const csv = stringify(rows)
    const filename = `${localize(locale, 'export.receipts.filenamePrefix')}_${new Date().toISOString().split('.')[0].replaceAll(/[^\d]+/g, '-')}.csv`

    await context.replyWithDocument(
      { source: Buffer.from(csv), filename },
      { caption: localize(locale, 'export.receipts.command.message') }
    )
  }

  return {
    exportReceiptsCsv,
  }
}
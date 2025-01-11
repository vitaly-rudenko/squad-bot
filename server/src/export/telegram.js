import { stringify } from 'csv-stringify/sync'
import { MAX_DEBTS_PER_RECEIPT } from '../debts/constants.js'
import { registry } from '../registry.js'

export function createExportFlow() {
  const { receiptsStorage, debtsStorage, usersStorage } = registry.export()

  /** @param {import('telegraf').Context} context */
  const exportReceiptsCsv = async (context) => {
    const { items: receipts } = await receiptsStorage.find({
      limit: 1000,
      participantUserIds: [context.state.userId],
    })

    // TODO: Add message
    if (receipts.length === 0) return

    const debts = await debtsStorage.find({
      receiptIds: receipts.map(r => r.id),
      limit: receipts.length * MAX_DEBTS_PER_RECEIPT,
    })

    const users = await usersStorage.find({
      limit: 100,
      ids: [
        context.state.userId,
        ...receipts.map(r => r.payerId),
        ...debts.map(d => d.debtorId),
      ]
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
      ['Date', 'Description', 'Amount', 'Payer', ...users.map(user => renderUser(user.id))],
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

    await context.replyWithDocument(
      { source: Buffer.from(csv), filename: `receipts-${Date.now()}.csv` }
    )
  }

  return {
    exportReceiptsCsv,
  }
}
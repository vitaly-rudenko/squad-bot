import { stripIndent } from 'common-tags'

export function debtsCommand({ storage }) {
  return async (context) => {
    const userId = String(context.from.id)

    const users = await storage.findUsers()
    const ingoingDebts = await storage.aggregateIngoingDebts(userId)
    const outgoingDebts = await storage.aggregateOutgoingDebts(userId)

    function getUserName(id) {
      const user = users.find(u => u.id === id)
      return user ? user.name : `??? (${id})`
    }

    const ingoingDebtsFormatted = ingoingDebts.length > 0 ? `
Тебе должны:
${
  ingoingDebts
    .map(debt => `- ${getUserName(debt.userId)}: ${debt.amount} грн`)
    .join('\n')
}` : ''

const outgoingDebtsFormatted = outgoingDebts.length > 0 ? `
Ты должен:
${
  outgoingDebts
    .map(debt => `- ${getUserName(debt.userId)}: ${debt.amount} грн`)
    .join('\n')
}` : ''

    await context.reply([outgoingDebtsFormatted, ingoingDebtsFormatted].filter(Boolean).join('\n\n') || 'Долгов нет!')
  }
}
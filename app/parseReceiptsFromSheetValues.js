import { parseDebts } from './parseDebts.js'

export function parseReceiptsFromSheetValues(values) {
  const header = values[0].map(v => v.toLowerCase())
  const headerIndex = {
    date: header.indexOf('date'),
    payer: header.indexOf('payer'),
    description: header.indexOf('description'),
    receiptUrl: header.indexOf('receipt url'),
    amount: header.indexOf('amount'),
    debts: header.indexOf('debtors'),
  }

  return values.slice(1)
    .map((values) => {
      const { date, payer, description, receiptUrl, amount, debts } = Object.fromEntries(
        Object.entries(headerIndex).map(([key, index]) => [key, values[index]])
      )

      return {
        date: new Date(date),
        payer,
        description: description || null,
        receiptUrl: receiptUrl || null,
        amount: Number(amount),
        debts: parseDebts(debts),
      }
    })
}

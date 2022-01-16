import { getReceiptStatus } from './getReceiptStatus.js'
import { renderDebts } from './renderDebts.js'
import { renderMoney } from './renderMoney.js'
import { renderReceiptStatus } from './renderReceiptStatus.js'

// TODO: don't require sheet values or find an alternative solution
export function renderReceiptIntoSheetValues(sheetValues, receipt) {
  const formattedReceipt = {
    date: receipt.date.getTime(),
    payer: receipt.payer,
    description: receipt.description || '',
    receiptUrl: receipt.receiptUrl || '',
    amount: renderMoney(receipt.amount),
    debts: renderDebts(receipt.debts),
    status: renderReceiptStatus(getReceiptStatus(receipt)),
  }

  // TODO: reuse header somehow
  const header = sheetValues[0].map(v => v.toLowerCase())
  const headerIndex = {
    date: header.indexOf('date'),
    payer: header.indexOf('payer'),
    status: header.indexOf('status'),
    description: header.indexOf('description'),
    receiptUrl: header.indexOf('receipt url'),
    amount: header.indexOf('amount'),
    debts: header.indexOf('debtors'),
  }

  const values = new Array(sheetValues[0].length).fill('')

  for (const [key, value] of Object.entries(formattedReceipt)) {
    values[headerIndex[key]] = value
  }

  return values
}

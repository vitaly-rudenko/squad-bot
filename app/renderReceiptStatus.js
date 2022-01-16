import { renderMoney } from './renderMoney.js'

export function renderReceiptStatus({ status, paid }) {
  if (status === 'paid') {
    return 'Paid'
  }

  if (status === 'unpaid') {
    return 'Unpaid'
  }

  return `Partially paid (${renderMoney(paid)})`
}

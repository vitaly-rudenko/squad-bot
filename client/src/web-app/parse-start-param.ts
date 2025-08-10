import { Command } from './types'

export function parseStartParam(startParam?: string): Command | undefined {
  if (startParam === 'receipts') return { type: 'receipts' }
  if (startParam === 'payments') return { type: 'payments' }
  if (startParam === 'groups') return { type: 'groups' }
  if (startParam === 'cards') return { type: 'cards' }
  if (startParam?.startsWith('titles'))
    return { type: 'titles', params: { groupId: startParam.slice(6) } }
  if (startParam?.startsWith('roll-calls'))
    return { type: 'roll-calls', params: { groupId: startParam.slice(10) } }
  if (startParam?.startsWith('links'))
    return { type: 'links', params: { groupId: startParam.slice(5) } }

  if (startParam === 'new-receipt')
    return { type: 'receipt', params: { receiptId: 'new' } }
  if (startParam === 'new-payment')
    return { type: 'payment', params: { paymentId: 'new' } }
  if (startParam === 'new-card')
    return { type: 'card', params: { cardId: 'new' } }
  if (startParam?.startsWith('new-roll-call')) {
    return {
      type: 'roll-call',
      params: { groupId: startParam.slice(13), rollCallId: 'new' },
    }
  }

  if (startParam?.startsWith('pay-')) {
    const delimiterIndex = startParam.slice(4).indexOf('-')
    return {
      type: 'payment',
      params: {
        paymentId: 'new',
      },
      search: {
        to_user_id: startParam.slice(4, 4 + delimiterIndex),
        amount: Number(startParam.slice(5 + delimiterIndex)),
      },
    }
  }

  if (startParam?.startsWith('payment-'))
    return { type: 'payment', params: { paymentId: startParam.slice(8) } }
  if (startParam?.startsWith('receipt-'))
    return { type: 'receipt', params: { receiptId: startParam.slice(8) } }
  if (startParam?.startsWith('roll-call')) {
    const delimiterIndex = startParam.slice(10).indexOf('-')
    return {
      type: 'roll-call',
      params: {
        groupId: startParam.slice(9, 10 + delimiterIndex),
        rollCallId: startParam.slice(11 + delimiterIndex),
      },
    }
  }

  return undefined
}

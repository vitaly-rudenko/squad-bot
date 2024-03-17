import { describe, it, expect } from 'vitest'
import { parseStartParam } from '../../src/web-app/parse-start-param'

describe('parseStartParam()', () => {
  it('handles empty and invalid commands', () => {
    expect(parseStartParam()).toBeUndefined()
    expect(parseStartParam(undefined)).toBeUndefined()
    expect(parseStartParam('')).toBeUndefined()
    expect(parseStartParam('   ')).toBeUndefined()
    expect(parseStartParam('invalid_command')).toBeUndefined()
  })

  it('parses receipt commands', () => {
    expect(parseStartParam('receipts')).toEqual({ type: 'receipts' })
    expect(parseStartParam('new-receipt')).toEqual({ type: 'receipt', params: { receiptId: 'new' } })
    expect(parseStartParam('receipt-fake-receipt-id'))
      .toEqual({ type: 'receipt', params: { receiptId: 'fake-receipt-id' } })
  })

  it('parses payment commands', () => {
    expect(parseStartParam('payments')).toEqual({ type: 'payments' })
    expect(parseStartParam('new-payment')).toEqual({ type: 'payment', params: { paymentId: 'new' } })
    expect(parseStartParam('payment-fake-payment-id'))
      .toEqual({ type: 'payment', params: { paymentId: 'fake-payment-id' } })
    expect(parseStartParam('pay-10000199-12356'))
      .toEqual({ type: 'payment', params: { paymentId: 'new' }, search: { to_user_id: '10000199', amount: 12356 } })
  })

  it('parses cards commands', () => {
    expect(parseStartParam('cards')).toEqual({ type: 'cards' })
    expect(parseStartParam('new-card')).toEqual({ type: 'card', params: { cardId: 'new' } })
  })

  it('parses groups command', () => {
    expect(parseStartParam('groups')).toEqual({ type: 'groups' })
  })

  it('parses titles command', () => {
    expect(parseStartParam('titles-1234567890')).toEqual({ type: 'titles', params: { groupId: '-1234567890' } })
  })

  it('parses roll call commands', () => {
    expect(parseStartParam('roll-calls-1234567890'))
      .toEqual({ type: 'roll-calls', params: { groupId: '-1234567890' } })
    expect(parseStartParam('new-roll-call-1234567890'))
      .toEqual({ type: 'roll-call', params: { groupId: '-1234567890', rollCallId: 'new' } })
    expect(parseStartParam('roll-call-1234567890-fake-roll-call-id'))
      .toEqual({ type: 'roll-call', params: { groupId: '-1234567890', rollCallId: 'fake-roll-call-id' } })
  })
})
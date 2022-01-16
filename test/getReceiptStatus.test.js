import { expect } from 'chai'
import { getReceiptStatus } from '../app/getReceiptStatus.js'

describe('getReceiptStatus()', () => {
  it('should get receipt status (unpaid)', () => {
    expect(getReceiptStatus({
      amount: 125.68,
      debts: [
        { paid: 0 },
        { paid: 0 },
        { paid: 0 },
      ]
    })).to.deep.equal({
      status: 'unpaid',
      paid: 0,
    })
  })

  it('should get receipt status (partially paid)', () => {
    expect(getReceiptStatus({
      amount: 125.68,
      debts: [
        { paid: 0 },
        { paid: 20.5 },
        { paid: 30.25 },
      ]
    })).to.deep.equal({
      status: 'partiallyPaid',
      paid: 50.75,
    })
  })

  it('should get receipt status (paid)', () => {
    expect(getReceiptStatus({
      amount: 125.68,
      debts: [
        { paid: 74.93 },
        { paid: 20.5 },
        { paid: 30.25 },
      ]
    })).to.deep.equal({
      status: 'paid',
      paid: 125.68,
    })
  })
})

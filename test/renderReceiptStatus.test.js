import { expect } from 'chai'
import { stripIndent } from 'common-tags'
import { renderReceiptStatus } from '../app/renderReceiptStatus.js'

describe('renderReceiptStatus()', () => {
  it('should render receipt status (paid)', () => {
    expect(renderReceiptStatus({
      status: 'paid',
      paid: 128.65,
    })).to.equal(stripIndent`
      Paid
    `)
  })

  it('should render receipt status (unpaid)', () => {
    expect(renderReceiptStatus({
      status: 'unpaid',
      paid: 0,
    })).to.equal(stripIndent`
      Unpaid
    `)
  })

  it('should render receipt status (partially paid)', () => {
    expect(renderReceiptStatus({
      status: 'partiallyPaid',
      paid: 125.6,
    })).to.equal(stripIndent`
      Partially paid (125.60)
    `)
  })
})

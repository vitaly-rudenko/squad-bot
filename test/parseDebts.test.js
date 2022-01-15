import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { stripIndent } from 'common-tags'
import { parseDebts } from '../app/parseDebts.js'

chai.use(deepEqualInAnyOrder)

describe('parseDebts()', () => {
  it('should parse simple debts', () => {
    expect(parseDebts(stripIndent`
      Mikhail: 10 / 50
       Vitaly: 50.5/50.5
      John Doe:0/25.67 ?
    `)).to.deep.equalInAnyOrder([
      { name: 'Mikhail',  amount: 50,    paid: 10,   type: 'member', comment: null },
      { name: 'Vitaly',   amount: 50.5,  paid: 50.5, type: 'member', comment: null },
      { name: 'John Doe', amount: 25.67, paid: 0,    type: 'member', comment: '?' },
    ])
  })

  it('should parse external debts', () => {
    expect(parseDebts(stripIndent`
      *Some person:15/? (what?)
      * Anonymous: ? / 0.5
    `)).to.deep.equalInAnyOrder([
      { name: 'Some person', amount: null, paid: 15, type: 'external', comment: '(what?)' },
      { name: 'Anonymous',   amount: 0.5,  paid: 0,  type: 'external', comment: null },
    ])
  })

  it('should parse special cases', () => {
    expect(parseDebts(stripIndent`
      Nikita   :50 - no payment yet!
         * Mikhail:?
      Lorem Ipsum: ? 🎉
    `)).to.deep.equalInAnyOrder([
      { name: 'Nikita',      amount: 50,   paid: 0, type: 'member',   comment: '- no payment yet!' },
      { name: 'Mikhail',     amount: null, paid: 0, type: 'external', comment: null },
      { name: 'Lorem Ipsum', amount: null, paid: 0, type: 'member',   comment: '🎉' },
    ])
  })

  it('should throw an error when failed to parse a debt record', () => {
    expect(() => parseDebts(stripIndent`
      Mikhail: 10 / 50
      Vitaly: 50.5 / 50.5 (🎉)
      Hello world!
      Lorem Ipsum: ? (some additional comment)
    `)).to.throw('Could not parse a debt record: Hello world!')
  })
})

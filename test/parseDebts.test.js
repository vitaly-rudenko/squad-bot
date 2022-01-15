import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { stripIndent } from 'common-tags'
import { parseDebts } from '../app/parseDebts.js'

chai.use(deepEqualInAnyOrder)

describe('parseDebts()', () => {
  it('should parse debts', () => {
    expect(parseDebts(stripIndent`
      Mikhail: 10 / 50
      Vitaly: 50.5 / 50.5 (🎉)
      John Doe: 0 / 25.67
      Lorem Ipsum: ? (some additional comment)
    `)).to.deep.equalInAnyOrder([
      { name: 'Mikhail',     amount: 50,    paid: 10 },
      { name: 'Vitaly',      amount: 50.5,  paid: 50.5 },
      { name: 'John Doe',    amount: 25.67, paid: 0 },
      { name: 'Lorem Ipsum', amount: null,  paid: 0 },
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

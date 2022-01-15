import { expect } from 'chai'
import { stripIndent } from 'common-tags'
import { renderDebts } from '../app/renderDebts.js'

describe('renderDebts()', () => {
  it('should render debts', () => {
    expect(renderDebts([
      { name: 'Mikhail',     amount: 50,    paid: 10,   type: 'member',   comment: null },
      { name: 'Vitaly',      amount: 50.5,  paid: 50.5, type: 'member',   comment: null },
      { name: 'John Doe',    amount: 25.67, paid: 0,    type: 'member',   comment: '?' },
      { name: 'Some person', amount: null,  paid: 15,   type: 'external', comment: '(what?)' },
      { name: 'Anonymous',   amount: 0.5,   paid: 0,    type: 'external', comment: null },
      { name: 'Nikita',      amount: 50,    paid: 0,    type: 'member',   comment: '- no payment yet!' },
      { name: 'Mikhail',     amount: null,  paid: 0,    type: 'external', comment: null },
      { name: 'Lorem Ipsum', amount: null,  paid: 0,    type: 'member',   comment: '🎉' },
    ])).to.equal(stripIndent`
      Mikhail: 10 / 50
      Vitaly: 50.5 / 50.5
      John Doe: 0 / 25.67 ?
      *Some person: 15 / ? (what?)
      *Anonymous: 0 / 0.5
      Nikita: 0 / 50 - no payment yet!
      *Mikhail: 0 / ?
      Lorem Ipsum: 0 / ? 🎉
    `)
  })
})

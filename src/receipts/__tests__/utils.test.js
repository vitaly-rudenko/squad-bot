import { faker } from '@faker-js/faker'
import { prepareDebtsForUser } from '../utils'

/**
 * @param {Partial<import('../../users/types').User>} [user]
 * @returns {import('../../users/types').User}
 */
function createUser(user) {
  return {
    id: faker.string.numeric({ length: 12 }),
    name: faker.person.firstName(),
    username: faker.internet.userName(),
    locale: /** @type {import('../../localization/types').Locale} */ (faker.string.alpha({ length: 2 })),
    ...user,
  }
}

/** @param {number} number */
function createUsers(number) {
  return Array.from(new Array(number), (_, i) => createUser({ id: `user-${i + 1}` }))
}

describe('receipts/utils', () => {
  describe('prepareDebtsForUser()', () => {
    it('should aggregate debts for a debtor', () => {
      const payer = createUser({ id: 'payer' })
      const [debtor1, debtor2, debtor3, debtor4] = createUsers(4)

      const debtors = [payer, debtor1, debtor2]
      const ingoingDebts = [
        { fromUserId: debtor1.id, toUserId: payer.id, amount: 10 },
        { fromUserId: debtor3.id, toUserId: payer.id, amount: 20 },
      ]

      const outgoingDebts = [
        { fromUserId: payer.id, toUserId: debtor2.id, amount: 30 },
        { fromUserId: payer.id, toUserId: debtor4.id, amount: 40 },
      ]

      expect(prepareDebtsForUser({ user: payer, debtors, ingoingDebts, outgoingDebts }))
        .toEqual({
          ingoingDebts: [{ debtor: debtor1, amount: 10 }],
          outgoingDebts: [{ debtor: debtor2, amount: 30 }],
        })

      expect(prepareDebtsForUser({ user: debtor1, debtors, ingoingDebts, outgoingDebts }))
        .toEqual({
          ingoingDebts: [],
          outgoingDebts: [{ debtor: payer, amount: 10 }],
        })

      expect(prepareDebtsForUser({ user: debtor2, debtors, ingoingDebts, outgoingDebts }))
        .toEqual({
          ingoingDebts: [{ debtor: payer, amount: 30 }],
          outgoingDebts: [],
        })
    })
  })
})

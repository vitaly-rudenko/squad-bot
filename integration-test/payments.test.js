import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createPayment, createReceipt, createUsers, deletePayment, getDebts } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[payments]', () => {
  describe('DELETE /payments/{paymentId}', () => {
    it('should delete a payment', async () => {
      const [user1, user2, user3, user4] = await createUsers(4)

      await createReceipt(user1.id, {
        [user2.id]: 20,
        [user3.id]: 30,
        [user4.id]: 10,
      })

      const { id: payment1Id } = await createPayment(user2.id, user1.id, 20)
      const { id: payment2Id } = await createPayment(user3.id, user1.id, 10)
      const { id: payment3Id } = await createPayment(user3.id, user1.id, 20)
      const { id: payment4Id } = await createPayment(user4.id, user1.id, 40)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [],
        outgoingDebts: [{
          userId: user4.id,
          amount: 30,
        }]
      })

      await deletePayment(payment2Id)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user3.id,
          amount: 10,
        }],
        outgoingDebts: [{
          userId: user4.id,
          amount: 30,
        }]
      })

      await deletePayment(payment1Id)
      await deletePayment(payment4Id)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user2.id,
          amount: 20,
        }, {
          userId: user3.id,
          amount: 10,
        }, {
          userId: user4.id,
          amount: 10,
        }],
        outgoingDebts: []
      })

      await deletePayment(payment3Id)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user2.id,
          amount: 20,
        }, {
          userId: user3.id,
          amount: 30,
        }, {
          userId: user4.id,
          amount: 10,
        }],
        outgoingDebts: []
      })
    })
  })
})
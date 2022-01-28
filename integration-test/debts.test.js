import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createUsers, createReceipt, getDebts, createPayment, NO_DEBTS, createUser } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[debts]', () => {
  it('should calculate debts properly (1)', async () => {
    const [user1, user2] = await createUsers(2)

    await createReceipt(user1.id, {
      [user1.id]: 5,
      [user2.id]: 5,
    })

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 5,
      }],
      outgoingDebts: [],
    })

    expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [],
      outgoingDebts: [{
        userId: user1.id,
        amount: 5,
      }],
    })

    await createPayment(user2.id, user1.id, 5)

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder(NO_DEBTS)
    expect(await getDebts(user2.id)).to.deep.equalInAnyOrder(NO_DEBTS)
  })

  it('should calculate debts properly (2)', async () => {
    const [user1, user2, user3] = await createUsers(3)

    await createReceipt(user1.id, {
      [user1.id]: 2,
      [user2.id]: 3,
      [user3.id]: 5,
    })

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 3,
      }, {
        userId: user3.id,
        amount: 5,
      }],
      outgoingDebts: [],
    })

    await createPayment(user3.id, user1.id, 4)

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 3,
      }, {
        userId: user3.id,
        amount: 1,
      }],
      outgoingDebts: [],
    })

    await createPayment(user3.id, user1.id, 1)

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 3,
      }],
      outgoingDebts: [],
    })

    expect(await getDebts(user3.id)).to.deep.equalInAnyOrder(NO_DEBTS)
  })

  describe('[cross debts]', () => {
    it('should calculate cross debts properly (1)', async () => {
      const user1 = await createUser(1)
      const user2 = await createUser(2)

      await createReceipt(user1.id, {
        [user1.id]: 5,
        [user2.id]: 5,
      })

      await createReceipt(user2.id, {
        [user1.id]: 5,
        [user2.id]: 5,
      })

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder(NO_DEBTS)
      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder(NO_DEBTS)
    })

    it('should calculate cross debts properly (2)', async () => {
      const [user1, user2] = await createUsers(2)

      await createReceipt(user1.id, { [user2.id]: 10 })
      await createReceipt(user2.id, { [user1.id]: 6 })

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user2.id,
          amount: 4,
        }],
        outgoingDebts: [],
      })

      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [],
        outgoingDebts: [{
          userId: user1.id,
          amount: 4,
        }],
      })
    })

    it('should calculate cross debts properly (3)', async () => {
      const [user1, user2, user3] = await createUsers(3)

      await createReceipt(user1.id, {
        [user1.id]: 10,
        [user2.id]: 15,
        [user3.id]: 5,
      })

      await createReceipt(user1.id, {
        [user1.id]: 5,
        [user3.id]: 10,
      })

      await createReceipt(user2.id, {
        [user1.id]: 20,
        [user3.id]: 5,
      })

      await createReceipt(user3.id, {
        [user1.id]: 3,
        [user2.id]: 7,
      })

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user3.id,
          amount: 12,
        }],
        outgoingDebts: [{
          userId: user2.id,
          amount: 5,
        }],
      })

      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user1.id,
          amount: 5,
        }],
        outgoingDebts: [{
          userId: user3.id,
          amount: 2,
        }],
      })

      expect(await getDebts(user3.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user2.id,
          amount: 2,
        }],
        outgoingDebts: [{
          userId: user1.id,
          amount: 12,
        }],
      })

      await createPayment(user1.id, user2.id, 5) // exact
      await createPayment(user2.id, user3.id, 5) // more than needed (+3)
      await createPayment(user3.id, user1.id, 10) // less than needed (-2)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user3.id,
          amount: 2,
        }],
        outgoingDebts: [],
      })

      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{
          userId: user3.id,
          amount: 3,
        }],
        outgoingDebts: [],
      })

      expect(await getDebts(user3.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [],
        outgoingDebts: [{
          userId: user1.id,
          amount: 2,
        }, {
          userId: user2.id,
          amount: 3,
        }],
      })

      await createPayment(user3.id, user2.id, 3) // return overpayment
      await createPayment(user3.id, user1.id, 2) // return remaining debt

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder(NO_DEBTS)
      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder(NO_DEBTS)
      expect(await getDebts(user3.id)).to.deep.equalInAnyOrder(NO_DEBTS)
    })
  })

  describe('[extra payments]', () => {
    it('should add debts for extra payments (1)', async () => {
      const [user1, user2] = await createUsers(2)

      await createPayment(user1.id, user2.id, 10)

      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [{ userId: user2.id, amount: 10 }],
        outgoingDebts: [],
      })

      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
        ingoingDebts: [],
        outgoingDebts: [{ userId: user1.id, amount: 10 }],
      })
    })
  })
})

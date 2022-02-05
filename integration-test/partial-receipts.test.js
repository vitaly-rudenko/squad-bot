import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createReceipt, createUsers, expectReceiptsToEqual, expectReceiptToShallowEqual, getDebts, getReceipt, getReceipts } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[partial receipts]', () => {
  it.only('should create partial receipts', async () => {
    const [user1, user2] = await createUsers(2)

    const receiptId = await createReceipt(user1.id, {
      [user1.id]: 10,
      [user2.id]: null
    }, { amount: 20 })

    expectReceiptToShallowEqual(await getReceipt(receiptId), {
      payerId: user1.id,
      amount: 20,
      hasPhoto: false,
      description: null,
      debts: [{
        debtorId: user1.id,
        amount: 10,
      }, {
        debtorId: user2.id,
        amount: null,
      }]
    })

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user2.id,
        amount: 0,
        isUncertain: true,
      }],
      outgoingDebts: [],
      unfinishedReceipts: [receiptId],
    })
  })
})
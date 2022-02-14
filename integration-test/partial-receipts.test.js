import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createReceipt, createUsers, expectReceiptsToEqual, expectReceiptToShallowEqual, getDebts, getReceipt, getReceipts } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[partial receipts]', () => {
  it('should create partial receipts (simple)', async () => {
    const [user1, user2] = await createUsers(2)

    const { id: receiptId } = await createReceipt(user1.id, {
      [user1.id]: 10,
      [user2.id]: null
    }, { amount: 20 })

    expectReceiptToShallowEqual(await getReceipt(receiptId, user1.id), {
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
      unfinishedReceiptIds: [receiptId],
    })
  })

  it('should create partial receipts (complex)', async () => {
    const [user1, user2, user3, user4] = await createUsers(4)

    const { id: receipt1Id } = await createReceipt(user1.id, {
      [user1.id]: 10,
      [user2.id]: 20,
      [user3.id]: null,
    }, { amount: 50 })

    const { id: receipt2Id } = await createReceipt(user2.id, {
      [user1.id]: 50,
      [user2.id]: null,
      [user3.id]: null,
      [user4.id]: 25,
    }, { amount: 100 })

    const { id: receipt3Id } = await createReceipt(user3.id, {
      [user2.id]: 5,
      [user3.id]: 5,
      [user4.id]: null,
    }, { amount: 15 })

    const { id: receipt4Id } = await createReceipt(user4.id, {
      [user3.id]: null,
      [user4.id]: null,
    }, { amount: 15 })

    const { id: receipt5Id } = await createReceipt(user2.id, {
      [user2.id]: 10,
      [user3.id]: 15,
    }, { amount: 25 })

    expect(await getDebts(user1.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user3.id,
        amount: 0,
        isUncertain: true,
      }],
      outgoingDebts: [{
        userId: user2.id,
        amount: 30,
      }],
      unfinishedReceiptIds: [receipt1Id],
    })

    expect(await getDebts(user2.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user1.id,
        amount: 30,
      }, {
        userId: user3.id,
        amount: 10,
        isUncertain: true,
      }, {
        userId: user4.id,
        amount: 25,
      }],
      outgoingDebts: [],
      unfinishedReceiptIds: [receipt2Id],
    })

    expect(await getDebts(user3.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user4.id,
        amount: 0,
        isUncertain: true,
      }],
      outgoingDebts: [{
        userId: user1.id,
        amount: 0,
        isUncertain: true,
      }, {
        userId: user2.id,
        amount: 10,
        isUncertain: true,
      }, {
        userId: user4.id,
        amount: 0,
        isUncertain: true,
      }],
      unfinishedReceiptIds: [receipt1Id, receipt2Id, receipt3Id, receipt4Id],
    })

    expect(await getDebts(user4.id)).to.deep.equalInAnyOrder({
      ingoingDebts: [{
        userId: user3.id,
        amount: 0,
        isUncertain: true,
      }],
      outgoingDebts: [{
        userId: user2.id,
        amount: 25,
      }, {
        userId: user3.id,
        amount: 0,
        isUncertain: true,
      }],
      unfinishedReceiptIds: [receipt3Id, receipt4Id],
    })
  })
})
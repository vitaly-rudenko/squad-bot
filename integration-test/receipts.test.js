import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createUsers, getReceipts, createReceipt, expectReceiptsToEqual } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[receipts]', () => {
  describe('POST /receipts', () => {
    it('should upload receipt photo', async () => {
      const [user] = await createUsers(1)

      await createReceipt(user.id, {
        [user.id]: 1,
      }, { photo: Buffer.from('hello world'), mime: 'image/jpeg' })
    })
  })

  describe('GET /receipts', () => {
    it('should returns receipts by user ID', async () => {
      const [user1, user2, user3, user4] = await createUsers(4)
  
      expect(await getReceipts(user1.id)).to.deep.equalInAnyOrder([])
      expect(await getReceipts(user2.id)).to.deep.equalInAnyOrder([])
      expect(await getReceipts(user3.id)).to.deep.equalInAnyOrder([])
      expect(await getReceipts(user4.id)).to.deep.equalInAnyOrder([])
  
      await createReceipt(user1.id, {
        [user1.id]: 5,
        [user2.id]: 15,
      }, { photo: Buffer.from('hello world') })
  
      const receipt1 = {
        payerId: user1.id,
        amount: 20,
        hasPhoto: true,
        description: null,
        debts: [{
          debtorId: user1.id,
          amount: 5,
        }, {
          debtorId: user2.id,
          amount: 15,
        }]
      }
  
      expectReceiptsToEqual(await getReceipts(user1.id), [receipt1])
  
      expect(await getReceipts(user2.id)).to.deep.equalInAnyOrder(await getReceipts(user1.id))
      expect(await getReceipts(user3.id)).to.deep.equalInAnyOrder([])
  
      await createReceipt(user3.id, {
        [user1.id]: 50,
        [user3.id]: 50,
      }, { description: 'hello world' })
  
      const receipt2 = {
        payerId: user3.id,
        hasPhoto: false,
        description: 'hello world',
        amount: 100,
        debts: [{
          debtorId: user1.id,
          amount: 50,
        }, {
          debtorId: user3.id,
          amount: 50,
        }]
      }
  
      expectReceiptsToEqual(await getReceipts(user1.id), [receipt2, receipt1])
      expectReceiptsToEqual(await getReceipts(user2.id), [receipt1])
      expectReceiptsToEqual(await getReceipts(user3.id), [receipt2])
      expect(await getReceipts(user4.id)).to.deep.equalInAnyOrder([])
    })
  })
})

import chai, { expect } from 'chai'

import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createUsers, getReceipts, createReceipt, expectReceiptsToEqual, getPhoto, expectReceiptToShallowEqual, getReceipt, deleteReceipt, getDebts, NO_DEBTS, createUser, doesPhotoExist, receiptPhotoBuffer, updatedReceiptPhotoBuffer } from './helpers.js'

chai.use(deepEqualInAnyOrder)

describe('[receipts]', () => {
  describe('POST /receipts', () => {
    it('should upload & return receipt photo', async () => {
      const user = await createUser()

      await createReceipt(user.id, {
        [user.id]: 1,
      }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      const { items: [receipt] } = await getReceipts(user.id)

      const { binary, mime } = await getPhoto(receipt.photoFilename)

      expect(mime).to.equal('image/png')
      expect(binary).to.deep.equal(receiptPhotoBuffer.buffer)
      expect(await doesPhotoExist(receipt.photoFilename)).to.be.true
    })

    it('should return 404 when there is no receipt photo', async () => {
      const user = await createUser()

      const { id: receiptId } = await createReceipt(user.id, { [user.id]: 1 })
      const response = await getPhoto(receiptId)

      expect(response.status).to.equal(404)
    })

    it('should keep original date and ID of receipt when updated', async () => {
      const user = await createUser()

      const { id: receiptId } = await createReceipt(user.id, { [user.id]: 10 })

      const originalReceipt = await getReceipt(receiptId, user.id)

      const { id: updatedReceiptId } = await createReceipt(user.id, { [user.id]: 20 }, { description: 'hello world', receiptId })

      const receipt = await getReceipt(receiptId, user.id)

      expect(updatedReceiptId).to.equal(originalReceipt.id)
      expect(receipt.createdAt).to.equal(originalReceipt.createdAt)
      expectReceiptToShallowEqual(receipt, {
        payerId: user.id,
        amount: 20,
        description: 'hello world',
        photoFilename: undefined,
        createdByUserId: user.id,
        updatedByUserId: user.id,
        debts: [{
          debtorId: user.id,
          amount: 20,
        }]
      })
    })

    it('should update the receipt (leave photo)', async () => {
      const [user1, user2, user3] = await createUsers(3)

      const { id: receiptId } = await createReceipt(user1.id, { [user1.id]: 10 }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      const photo1 = await getPhoto(receiptId)

      await createReceipt(user2.id, { [user1.id]: 10, [user3.id]: 20 }, { leavePhoto: true, description: 'hello world', receiptId })

      const receipt = await getReceipt(receiptId, user2.id)

      expectReceiptToShallowEqual(receipt, {
        payerId: user2.id,
        amount: 30,
        description: 'hello world',
        photoFilename: 'photo.jpg',
        createdByUserId: user1.id,
        updatedByUserId: user2.id,
        debts: [{
          debtorId: user1.id,
          amount: 10,
        }, {
          debtorId: user3.id,
          amount: 20,
        }]
      })

      const photo2 = await getPhoto(receiptId)

      expect(photo1.mime).to.equal(photo2.mime)
      expect(photo1.binary).to.deep.equal(photo2.binary)
      expect(await doesPhotoExist(receipt.photoFilename)).to.be.true
    })

    it('should update the receipt (delete photo)', async () => {
      const [user1, user2] = await createUsers(2)

      const { id: receiptId, photoFilename } = await createReceipt(user1.id, { [user1.id]: 10 }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      await createReceipt(user2.id, { [user1.id]: 10 }, { description: 'my receipt', receiptId })

      const receipt = await getReceipt(receiptId, user2.id)

      expectReceiptToShallowEqual(receipt, {
        payerId: user2.id,
        amount: 10,
        description: 'my receipt',
        photoFilename: undefined,
        createdByUserId: user1.id,
        updatedByUserId: user2.id,
        debts: [{
          debtorId: user1.id,
          amount: 10,
        }]
      })

      const response = await getPhoto(receiptId)

      expect(response.status).to.equal(404)
      expect(await doesPhotoExist(photoFilename)).to.be.false
    })

    it('should update the receipt (replace photo)', async () => {
      const [user1, user2] = await createUsers(2)

      const receipt1 = await createReceipt(user1.id, { [user1.id]: 10 },
        { photo: receiptPhotoBuffer, mime: 'image/png' })

      const receipt2 = await createReceipt(user1.id, { [user2.id]: 5 },
        { photo: updatedReceiptPhotoBuffer, mime: 'image/jpeg', receiptId: receipt1.id })

      expectReceiptToShallowEqual(receipt2, {
        payerId: user1.id,
        amount: 5,
        photoFilename: 'photo.jpg',
        createdByUserId: user1.id,
        updatedByUserId: user1.id,
        debts: [{
          debtorId: user2.id,
          amount: 5,
        }]
      })

      const photo = await getPhoto(receipt2.photoFilename)

      expect(photo.mime).to.equal('image/jpeg')
      expect(photo.binary).to.deep.eq(updatedReceiptPhotoBuffer.buffer)
      expect(await doesPhotoExist(receipt1.photoFilename)).to.be.false
      expect(await doesPhotoExist(receipt2.photoFilename)).to.be.true
    })
  })

  describe('GET /receipts', () => {
    it('should returns receipts by user ID', async () => {
      const [user1, user2, user3, user4] = await createUsers(4)

      expect(await getReceipts(user1.id)).to.deep.equal({ items: [], total: 0 })
      expect(await getReceipts(user2.id)).to.deep.equal({ items: [], total: 0 })
      expect(await getReceipts(user3.id)).to.deep.equal({ items: [], total: 0 })
      expect(await getReceipts(user4.id)).to.deep.equal({ items: [], total: 0 })

      await createReceipt(user1.id, {
        [user1.id]: 5,
        [user2.id]: 15,
      }, { photo: receiptPhotoBuffer, mime: 'image/jpeg' })

      const receipt1 = {
        payerId: user1.id,
        amount: 20,
        photoFilename: 'photo.jpg',
        createdByUserId: user1.id,
        updatedByUserId: user1.id,
        debts: [{
          debtorId: user1.id,
          amount: 5,
        }, {
          debtorId: user2.id,
          amount: 15,
        }]
      }

      expectReceiptsToEqual((await getReceipts(user1.id)).items, [receipt1])

      expect((await getReceipts(user2.id)).items).to.deep.equalInAnyOrder((await getReceipts(user1.id)).items)
      expect(await getReceipts(user3.id)).to.deep.equal({ items: [], total: 0 })

      await createReceipt(user3.id, {
        [user1.id]: 50,
        [user3.id]: 50,
      }, { description: 'hello world' })

      const receipt2 = {
        payerId: user3.id,
        photoFilename: undefined,
        description: 'hello world',
        amount: 100,
        createdByUserId: user3.id,
        updatedByUserId: user3.id,
        debts: [{
          debtorId: user1.id,
          amount: 50,
        }, {
          debtorId: user3.id,
          amount: 50,
        }]
      }

      expectReceiptsToEqual((await getReceipts(user1.id)).items, [receipt2, receipt1])
      expectReceiptsToEqual((await getReceipts(user2.id)).items, [receipt1])
      expectReceiptsToEqual((await getReceipts(user3.id)).items, [receipt2])
      expect(await getReceipts(user4.id)).to.deep.equal({ items: [], total: 0 })
    })
  })

  describe('DELETE /receipts/{receiptId}', () => {
    it('should delete the receipt and its debts (simple)', async () => {
      const [user1, user2] = await createUsers(2)

      const { id: receiptId } = await createReceipt(user1.id, {
        [user1.id]: 10,
        [user2.id]: 10,
      })

      await deleteReceipt(receiptId, user1.id)

      expect(await getReceipts(user1.id)).to.deep.equal({ items: [], total: 0 })
      expect(await getReceipts(user2.id)).to.deep.equal({ items: [], total: 0 })
      expect(await getDebts(user1.id)).to.deep.equalInAnyOrder(NO_DEBTS)
      expect(await getDebts(user2.id)).to.deep.equalInAnyOrder(NO_DEBTS)
    })

    it('should delete the receipt and its debts (complex)', async () => {
      const [user1, user2] = await createUsers(2)

      const { id: receipt1Id } = await createReceipt(user1.id, {
        [user1.id]: 10,
        [user2.id]: 10,
      })

      const { id: receipt2Id } = await createReceipt(user2.id, {
        [user1.id]: 10,
      })

      const { id: receipt3Id } = await createReceipt(user1.id, {
        [user2.id]: 10,
      }, { description: 'hello world' })

      await deleteReceipt(receipt2Id, user2.id)

      expect((await getReceipts(user1.id)).items.map(r => r.id)).to.deep.equalInAnyOrder([receipt1Id, receipt3Id])
      expect((await getReceipts(user2.id)).items.map(r => r.id)).to.deep.equalInAnyOrder([receipt1Id, receipt3Id])

      await deleteReceipt(receipt1Id, user1.id)

      expect((await getReceipts(user1.id)).items.map(r => r.id)).to.deep.equalInAnyOrder([receipt3Id])
      expect((await getReceipts(user2.id)).items.map(r => r.id)).to.deep.equalInAnyOrder([receipt3Id])

      await deleteReceipt(receipt3Id, user1.id)

      expect((await getReceipts(user1.id))).to.deep.equal({ items: [], total: 0 })
      expect((await getReceipts(user2.id))).to.deep.equal({ items: [], total: 0 })
    })

    it('should delete the receipt photo', async () => {
      const user = await createUser()

      const { id: receiptId, photoFilename } = await createReceipt(user.id, { [user.id]: 1 }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      await deleteReceipt(receiptId, user.id)

      const response = await getPhoto(receiptId)

      expect(response.status).to.equal(404)
      expect(await doesPhotoExist(photoFilename)).to.be.false
    })
  })
})

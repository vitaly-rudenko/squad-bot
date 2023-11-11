import chai, { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { createUsers, getReceipts, createReceipt, expectReceiptsToEqual, getReceiptPhoto, expectReceiptToShallowEqual, getReceipt, deleteReceipt, getDebts, NO_DEBTS } from './helpers.js'

chai.use(deepEqualInAnyOrder)

const receiptPhotoBuffer = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), './assets/receipt.png')
)

const updatedReceiptPhotoBuffer = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), './assets/receipt_updated.jpeg')
)

describe('[receipts]', () => {
  describe('POST /receipts', () => {
    it('should upload & compress receipt photo', async () => {
      const [user] = await createUsers(1)

      await createReceipt(user.id, {
        [user.id]: 1,
      }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      const [receipt] = await getReceipts(user.id)

      const { photo, mime } = await getReceiptPhoto(receipt.id)

      expect(mime).to.equal('image/jpeg')
    })

    it('should return 404 when there is no receipt photo', async () => {
      const [user] = await createUsers(1)

      const { id: receiptId } = await createReceipt(user.id, { [user.id]: 1 })
      const response = await getReceiptPhoto(receiptId)

      expect(response.status).to.equal(404)
    })

    it('should keep original date and ID of receipt when updated', async () => {
      const [user] = await createUsers(1)

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
        hasPhoto: false,
        debts: [{
          debtorId: user.id,
          amount: 20,
        }]
      })
    })

    it('should update the receipt (leave photo)', async () => {
      const [user1, user2, user3] = await createUsers(3)

      const { id: receiptId } = await createReceipt(user1.id, { [user1.id]: 10 }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      const photo1 = await getReceiptPhoto(receiptId)

      await createReceipt(user2.id, { [user1.id]: 10, [user3.id]: 20 }, { leavePhoto: true, description: 'hello world', receiptId })

      const receipt = await getReceipt(receiptId, user2.id)

      expectReceiptToShallowEqual(receipt, {
        payerId: user2.id,
        amount: 30,
        description: 'hello world',
        hasPhoto: true,
        debts: [{
          debtorId: user1.id,
          amount: 10,
        }, {
          debtorId: user3.id,
          amount: 20,
        }]
      })

      const photo2 = await getReceiptPhoto(receiptId)

      expect(photo1.mime).to.equal(photo2.mime)
      expect(photo1.photo).to.deep.equal(photo2.photo)
    })

    it('should update the receipt (delete photo)', async () => {
      const [user1, user2] = await createUsers(2)

      const { id: receiptId } = await createReceipt(user1.id, { [user1.id]: 10 }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      await createReceipt(user2.id, { [user1.id]: 10 }, { description: 'my receipt', receiptId })

      const receipt = await getReceipt(receiptId, user2.id)

      expectReceiptToShallowEqual(receipt, {
        payerId: user2.id,
        amount: 10,
        description: 'my receipt',
        hasPhoto: false,
        debts: [{
          debtorId: user1.id,
          amount: 10,
        }]
      })

      const response = await getReceiptPhoto(receiptId)

      expect(response.status).to.equal(404)
    })

    it('should update the receipt (replace photo)', async () => {
      const [user1, user2] = await createUsers(2)

      const { id: receiptId } = await createReceipt(user1.id, { [user1.id]: 10 }, { photo: receiptPhotoBuffer, mime: 'image/png' })

      const photo1 = await getReceiptPhoto(receiptId)

      await createReceipt(user1.id, { [user2.id]: 5 }, { photo: updatedReceiptPhotoBuffer, mime: 'image/jpeg', receiptId })

      const receipt = await getReceipt(receiptId, user1.id)

      expectReceiptToShallowEqual(receipt, {
        payerId: user1.id,
        amount: 5,
        description: null,
        hasPhoto: true,
        debts: [{
          debtorId: user2.id,
          amount: 5,
        }]
      })

      const photo2 = await getReceiptPhoto(receiptId)

      expect(photo2.mime).to.equal('image/jpeg')
      expect(photo2.photo).not.to.deep.equal(photo1.buffer)
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
      }, { photo: receiptPhotoBuffer, mime: 'image/jpeg' })

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

  describe('DELETE /receipts/{receiptId}', () => {
    it('should delete the receipt and its debts (simple)', async () => {
      const [user1, user2] = await createUsers(2)

      const { id: receiptId } = await createReceipt(user1.id, {
        [user1.id]: 10,
        [user2.id]: 10,
      })

      await deleteReceipt(receiptId, user1.id)

      expect(await getReceipts(user1.id)).to.deep.equal([])
      expect(await getReceipts(user2.id)).to.deep.equal([])
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
        [user2.id]: null,
      }, { description: 'hello world' })

      await deleteReceipt(receipt2Id, user2.id)

      expect((await getReceipts(user1.id)).map(r => r.id)).to.deep.equalInAnyOrder([receipt1Id, receipt3Id])
      expect((await getReceipts(user2.id)).map(r => r.id)).to.deep.equalInAnyOrder([receipt1Id, receipt3Id])

      await deleteReceipt(receipt1Id, user1.id)

      expect((await getReceipts(user1.id)).map(r => r.id)).to.deep.equalInAnyOrder([receipt3Id])
      expect((await getReceipts(user2.id)).map(r => r.id)).to.deep.equalInAnyOrder([receipt3Id])

      await deleteReceipt(receipt3Id, user1.id)

      expect((await getReceipts(user1.id))).to.deep.equal([])
      expect((await getReceipts(user2.id))).to.deep.equal([])
    })
  })
})

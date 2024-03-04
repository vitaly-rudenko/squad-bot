import { api } from '../../jest/api'
import { access } from 'fs/promises'
import { getPhotoPath } from '../filesystem'
import { generateAuthHeaders, createUser, unordered } from '../../jest/helpers'

/**
 * @param {{
 *   receiptId?: string
 *   payerId: string
 *   description?: string
 *   amount: number
 *   debts: { [userId: string]: number }
 *   photo?: boolean | import('../types').Photo
 * }} input
 * @param {import('../../users/types').User} user
 * @returns {Promise<import('../types').ReceiptWithDebts>}
 */
async function saveReceipt(input, user) {
  const form = new FormData()
  form.set('payer_id', input.payerId)
  form.set('amount', input.amount)
  form.set('debts', JSON.stringify(input.debts))

  if (input.receiptId) {
    form.set('id', input.receiptId)
  }

  if (input.description) {
    form.set('description', input.description)
  }

  if (typeof input.photo === 'boolean') {
    form.set('leave_photo', String(input.photo))
  } else if (input.photo) {
    const filename = 'my-photo'
    const photoFile = new File([input.photo.buffer], filename, { type: input.photo.mimetype })
    form.set('photo', photoFile, filename)
  }

  const response = await api.post('/receipts', form, {
    headers: generateAuthHeaders(user),
  })

  return response.data
}

/**
 * @param {{
 *   payer: import('../../users/types').User
 *   debtors?: import('../../users/types').User[]
 * }} input
 * @param {import('../../users/types').User} [editor]
 */
async function createReceipt({ payer, debtors = [payer] }, editor = payer) {
  return saveReceipt({
    payerId: payer.id,
    amount: 25_00 * debtors.length,
    debts: debtors.reduce((debts, debtor) => {
      debts[debtor.id] = 25_00
      return debts
    }, {}),
  }, editor)
}

/**
 * @param {string} [photoFilename]
 * @returns {Promise<import('../types').Photo>}
 */
async function getPhoto(photoFilename) {
  const response = await api.get(`/photos/${photoFilename}`, { responseType: 'arraybuffer' })
  return {
    buffer: response.data,
    mimetype: response.headers['content-type'],
  }
}

/**
 * @param {string} receiptId
 * @param {import('../../users/types').User} user
 */
async function getReceipt(receiptId, user) {
  const response = await api.get(`/receipts/${receiptId}`, { headers: generateAuthHeaders(user) })
  return response.data
}

/**
 * @param {import('../../users/types').User} user
 * @returns {Promise<import('../types').ReceiptWithDebts[]>}
 */
async function getReceipts(user) {
  const response = await api.get('/receipts', { headers: generateAuthHeaders(user) })
  return response.data
}

/**
 * @param {string} receiptId
 * @param {import('../../users/types').User} user
 */
async function deleteReceipt(receiptId, user) {
  await api.delete(`/receipts/${receiptId}`, { headers: generateAuthHeaders(user) })
}

/**
 * @param {{
 *   receiptId?: string
 *   payerId: string
 *   description?: string
 *   amount?: number
 *   debts?: { [userId: string]: number }
 *   photo?: boolean | import('../types').Photo
 * }} input
 */
function body(input) {
  return {
    amount: 100_00,
    debts: { [input.payerId]: 100_00 },
    ...input,
  }
}

describe('/receipts', () => {
  describe('POST /', () => {
    it('creates a receipt', async () => {
      const payer = await createUser()
      const debtor1 = await createUser()
      const debtor2 = await createUser()

      const receipt = await saveReceipt({
        payerId: payer.id,
        amount: 100_00,
        debts: {
          [debtor1.id]: 75_25,
          [debtor2.id]: 24_75,
        },
      }, payer)

      expect(receipt).toStrictEqual({
        id: expect.any(String),
        payerId: payer.id,
        amount: 100_00,
        createdAt: expect.any(String),
        debts: [
          { debtorId: debtor1.id, amount: 75_25 },
          { debtorId: debtor2.id, amount: 24_75 },
        ],
      })
    });

    it('saves the photo', async () => {
      const user = await createUser()

      const photo = { buffer: Buffer.from('my-photo'), mimetype: 'image/jpeg' };
      const receipt = await saveReceipt(body({ payerId: user.id, photo }), user)

      expect(receipt.photoFilename).toMatch(/[a-zA-Z0-9]{16}.jpg/)

      await expect(getPhoto(receipt.photoFilename)).resolves.toEqual(photo)
    })

    it('fails to create a receipt with mismatched amount', async () => {
      const user = await createUser()

      await expect(saveReceipt({
        payerId: user.id,
        amount: 100_00,
        debts: {
          [user.id]: 75_25,
        },
      }, user)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              code: 'RECEIPT_AMOUNT_MISMATCH',
              message: 'The sum of the debts does not match the receipt amount',
            }
          }
        }
      })
    })

    it('updates the receipt', async () => {
      const user = await createUser()

      const receipt = await saveReceipt(body({ payerId: user.id }), user)

      const updatedReceipt = await saveReceipt({
        receiptId: receipt.id,
        payerId: user.id,
        amount: 200_00,
        debts: { [user.id]: 200_00 },
      }, user)

      await expect(getReceipt(receipt.id, user)).resolves.toStrictEqual(updatedReceipt)

      expect(updatedReceipt).toStrictEqual({
        id: receipt.id,
        payerId: user.id,
        amount: 200_00,
        createdAt: receipt.createdAt,
        debts: [
          { debtorId: user.id, amount: 200_00 },
        ],
      })
    })

    it('replaces the photo', async () => {
      const user = await createUser()

      const photo = { buffer: Buffer.from('photo-1'), mimetype: 'image/png' }
      const receipt = await saveReceipt(body({ payerId: user.id, photo }), user)

      const updatedPhoto = { buffer: Buffer.from('photo-2'), mimetype: 'image/jpeg' }
      const updatedReceipt = await saveReceipt(body({ receiptId: receipt.id, payerId: user.id, photo: updatedPhoto }), user)

      expect(updatedReceipt.photoFilename).not.toEqual(receipt.photoFilename)
      expect(updatedReceipt.photoFilename).toMatch(/[a-zA-Z0-9]{16}.jpg/)

      await expect(getReceipt(receipt.id, user)).resolves.toStrictEqual(updatedReceipt)

      await expect(access(getPhotoPath(receipt.photoFilename))).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(access(getPhotoPath(updatedReceipt.photoFilename))).resolves.toBeUndefined()

      await expect(getPhoto(receipt.photoFilename)).rejects.toMatchObject({ response: { status: 404 } })
      await expect(getPhoto(updatedReceipt.photoFilename)).resolves.toEqual(updatedPhoto)
    })

    it('deletes the photo', async () => {
      const user = await createUser()

      const photo = { buffer: Buffer.from('photo-1'), mimetype: 'image/png' }
      const receipt = await saveReceipt(body({ payerId: user.id, photo }), user)

      const updatedReceipt = await saveReceipt(body({ receiptId: receipt.id, payerId: user.id, photo: false }), user)

      expect(updatedReceipt.photoFilename).toBeUndefined()

      await expect(getReceipt(receipt.id, user)).resolves.toStrictEqual(updatedReceipt)

      await expect(access(getPhotoPath(receipt.photoFilename))).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(getPhoto(receipt.photoFilename)).rejects.toMatchObject({ response: { status: 404 } })
    })

    it('does not allow to create a receipt without participation', async () => {
      const user1 = await createUser()
      const user2 = await createUser()

      await expect(saveReceipt(body({ payerId: user1.id }), user2)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              code: 'NOT_PARTICIPATED_IN_RECEIPT',
              message: 'The editor must be a debtor or a payer in the receipt',
            }
          }
        }
      })
    })

    it('does not allow to update a receipt without participation', async () => {
      const user1 = await createUser()
      const user2 = await createUser()

      const receipt = await saveReceipt(body({ payerId: user1.id }), user1)

      await expect(saveReceipt(body({ receiptId: receipt.id, payerId: user1.id }), user2)).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            error: {
              code: 'NOT_PARTICIPATED_IN_RECEIPT',
              message: 'The editor must be a debtor or a payer in the receipt',
            }
          }
        }
      })
    })
  })

  describe('GET /', () => {
    it('returns receipts in which user participated', async () => {
      const payer = await createUser()
      const debtor1 = await createUser()
      const debtor2 = await createUser()
      const otherUser = await createUser()

      const receipt = await createReceipt({ payer, debtors: [debtor1, debtor2] }, payer)

      expect(await getReceipts(payer)).toEqual({ total: 1, items: [unordered(receipt)] })
      expect(await getReceipts(debtor1)).toEqual({ total: 1, items: [unordered(receipt)] })
      expect(await getReceipts(debtor2)).toEqual({ total: 1, items: [unordered(receipt)] })
      expect(await getReceipts(otherUser)).toEqual({ total: 0, items: [] })
    });

    it('returns receipts in descending order of creation', async () => {
      const payer = await createUser()
      const debtor = await createUser()

      const receipt1 = await createReceipt({ payer, debtors: [debtor] }, payer)
      const receipt2 = await createReceipt({ payer, debtors: [debtor] }, payer)
      const receipt3 = await createReceipt({ payer, debtors: [debtor] }, payer)

      expect(await getReceipts(payer)).toEqual(expect.objectContaining({
        items: [unordered(receipt3), unordered(receipt2), unordered(receipt1)],
      }))
    })

    it('does not return receipts in which user did not participate', async () => {
      const user1 = await createUser()
      const user2 = await createUser()
      const user3 = await createUser()

      const receipt1 = await createReceipt({ payer: user1, debtors: [user1] }, user1)
      const receipt2 = await createReceipt({ payer: user2, debtors: [user2] }, user2)

      expect(await getReceipts(user1)).toEqual({ total: 1, items: [unordered(receipt1)] })
      expect(await getReceipts(user2)).toEqual({ total: 1, items: [unordered(receipt2)] })
      expect(await getReceipts(user3)).toEqual({ total: 0, items: [] })
    })

    it.todo('paginates the results')
    it.todo('excludes deleted receipts')
  })

  describe('GET /:id', () => {
    it('returns the receipt', async () => {
      const payer = await createUser()
      const debtor = await createUser()

      const receipt = await createReceipt({ payer, debtors: [debtor] }, payer)

      await expect(getReceipt(receipt.id, payer)).resolves.toEqual(unordered(receipt))
      await expect(getReceipt(receipt.id, debtor)).resolves.toEqual(unordered(receipt))
    })

    it('does not return the receipt if user did not participate', async () => {
      const user1 = await createUser()
      const user2 = await createUser()

      const receipt = await createReceipt({ payer: user1, debtors: [user1] }, user1)

      await expect(getReceipt(receipt.id, user2)).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
            }
          }
        }
      })
    })

    it('returns not found if receipt does not exist', async () => {
      const user = await createUser()

      await expect(getReceipt('nonexistent', user)).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
            }
          }
        }
      })
    })

    it('does not return the receipt if it was deleted', async () => {
      const payer = await createUser()

      const photo = { buffer: Buffer.from('my-photo'), mimetype: 'image/jpeg' }
      const receipt = await saveReceipt(body({ payerId: payer.id, photo }), payer)

      await deleteReceipt(receipt.id, payer)

      await expect(access(getPhotoPath(receipt.photoFilename))).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(getPhoto(receipt.photoFilename)).rejects.toMatchObject({ response: { status: 404 } })

      await expect(getReceipt(receipt.id, payer)).rejects.toMatchObject({
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
            }
          }
        }
      })
    })
  })

  describe('DELETE /:id', () => {
    it.todo('deletes the receipt')
    it.todo('deletes the photo')
    it.todo('does not allow to delete a receipt without participation')
  })
})

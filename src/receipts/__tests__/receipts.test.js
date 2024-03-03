import jwt from 'jsonwebtoken'
import { env } from '../../env'
import { faker } from '@faker-js/faker'
import { api } from '../../jest/api'

/**
 * @param {Partial<import('../../users/types').User>} [input]
 * @returns {Promise<import('../../users/types').User>}
 */
async function createUser(input) {
  const name = faker.person.firstName()
  const username = faker.internet.userName({ firstName: name }).toLowerCase().replaceAll('.', '_')

  const user = {
    id: `${username}_${faker.string.nanoid(8)}`,
    name,
    username,
    locale: faker.helpers.arrayElement(['en', 'uk']),
    ...input,
  }

  await api.put('/users', {}, { headers: generateAuthHeaders(user) })

  return user
}

/** @param {import('../../users/types').User} user */
function generateAuthHeaders(user) {
  return {
    'Authorization': `Bearer ${jwt.sign({ user }, env.TOKEN_SECRET)}`,
  }
}

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
 *   debtors: import('../../users/types').User[]
 * }} input
 */
async function createReceipt({ payer, debtors }, user) {
  return saveReceipt({
    payerId: payer.id,
    amount: 25_00 * debtors.length,
    debts: debtors.reduce((debts, debtor) => {
      debts[debtor.id] = 25_00
      return debts
    }, {}),
  }, user)
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
 * @param {T} input
 * @returns {T}
 * @template T
 */
function unordered(input) {
  if (typeof input !== 'object' || input === null) {
    return input
  }

  if (Array.isArray(input)) {
    return expect.toIncludeSameMembers(input.map(unordered))
  }

  return Object.entries(input).reduce((result, [key, value]) => {
    result[key] = unordered(value)
    return result
  }, {})
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
      const photo = {
        buffer: Buffer.from('my-photo'),
        mimetype: 'image/jpeg',
      };

      const receipt = await saveReceipt({
        payerId: user.id,
        amount: 100_00,
        debts: { [user.id]: 100_00 },
        photo,
      }, user)

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
          data: {
            error: {
              code: 'RECEIPT_AMOUNT_MISMATCH',
              message: 'The sum of the debts does not match the receipt amount',
            }
          }
        }
      })
    })

    it.todo('updates the receipt')
    it.todo('replaces the photo')
    it.todo('deletes the photo')
    it.todo('does not allow to create a receipt without participation')
    it.todo('does not allow to update a receipt without participation')
  })

  describe('GET /', () => {
    it('returns receipts in which user participated', async () => {
      const editor = await createUser()
      const payer = await createUser()
      const debtor1 = await createUser()
      const debtor2 = await createUser()

      const receipt = await createReceipt({ payer, debtors: [debtor1, debtor2] }, editor)

      expect(await getReceipts(payer)).toEqual({ total: 1, items: [unordered(receipt)] })
      expect(await getReceipts(debtor1)).toEqual({ total: 1, items: [unordered(receipt)] })
      expect(await getReceipts(debtor2)).toEqual({ total: 1, items: [unordered(receipt)] })
      expect(await getReceipts(editor)).toEqual({ total: 0, items: [] })
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
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
            }
          }
        }
      })
    })

    it.todo('does not return the receipt if it was deleted')
  })

  describe('DELETE /:id', () => {
    it.todo('deletes the receipt')
    it.todo('deletes the photo')
    it.todo('does not allow to delete a receipt without participation')
  })
})

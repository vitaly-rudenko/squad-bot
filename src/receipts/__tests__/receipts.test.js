import jwt from 'jsonwebtoken'
import { env } from '../../env'
import { faker } from '@faker-js/faker'
import { api } from '../../jest/api'

/**
 * @param {Partial<import('../../users/types').User>} [input]
 * @returns {Promise<import('../../users/types').User>}
 */
async function createUser(input) {
  const user = {
    id: faker.string.uuid(),
    username: faker.internet.userName(),
    name: faker.person.firstName(),
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

describe('/receipts', () => {
  describe('POST /receipts', () => {
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
  })
})

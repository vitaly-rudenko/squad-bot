import { expect } from 'chai'
import { saveReceiptSchema } from '../../../../src/receipts/schemas.js'
import { StructError } from 'superstruct'

const receipt = {
  id: 'fake-receipt-id',
  payer_id: 'fake-payer-id',
  description: 'hello world',
  amount: '1234',
  debts: JSON.stringify({
    'fake-user-1': '1200',
    'fake-user-2': '32',
  }),
  leave_photo: 'true',
}

const minimalReceipt = {
  payer_id: 'fake-payer-id',
  amount: '1234',
  debts: JSON.stringify({
    'fake-user-1': '1200'
  }),
}

describe('schemas/receipts', () => {
  describe('saveReceiptSchema', () => {
    it('should allow valid receipts', () => {
      // all fields
      expect(saveReceiptSchema.create(receipt)).to.deep.eq({
        id: 'fake-receipt-id',
        payer_id: 'fake-payer-id',
        description: 'hello world',
        amount: 1234,
        debts: [{
          debtorId: 'fake-user-1',
          amount: 1200,
        }, {
          debtorId: 'fake-user-2',
          amount: 32,
        }],
        leave_photo: true,
      })

      // required-only
      expect(saveReceiptSchema.create(minimalReceipt)).to.deep.eq({
        payer_id: 'fake-payer-id',
        amount: 1234,
        debts: [{
          debtorId: 'fake-user-1',
          amount: 1200,
        }],
      })
    })

    it('should validate description', () => {
      for (const description of [undefined, 'hello world', 'a', 'a'.repeat(64)]) {
        expect(
          saveReceiptSchema.create({
            ...minimalReceipt,
            description,
          }).description
        ).to.eq(description)
      }

      for (const description of ['', 'a'.repeat(65), 'a'.repeat(1000)]) {
        expect(
          () => saveReceiptSchema.create({
            ...minimalReceipt,
            description,
          })
        ).to.throw(StructError)
      }
    })

    it('should validate debts', () => {
      expect(
        saveReceiptSchema.create({
          ...minimalReceipt,
          debts: JSON.stringify({ 'fake-user-1': '100' }),
        }).debts
      ).to.deep.eq([{ debtorId: 'fake-user-1', amount: 100 }])

      expect(
        saveReceiptSchema.create({
          ...minimalReceipt,
          debts: JSON.stringify(Object.fromEntries(
            Array.from(new Array(10), (_, i) => [`fake-user-${i + 1}`, '100'])
          )),
        }).debts
      ).to.deep.eq(Array.from(new Array(10), (_, i) => ({ debtorId: `fake-user-${i + 1}`, amount: 100 })))

      expect(
        () => saveReceiptSchema.create({
          ...minimalReceipt,
          debts: {},
        })
      ).to.throw(StructError)

      expect(
        () => saveReceiptSchema.create({
          ...minimalReceipt,
          debts: JSON.stringify(Object.fromEntries(
            Array.from(new Array(11), (_, i) => [`fake-user-${i + 1}`, '100'])
          )),
        })
      ).to.throw(StructError)
    })
  })
})

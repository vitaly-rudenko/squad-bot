import { expect } from 'chai'
import { amountSchema, stringifiedBooleanSchema, zeroableAmountSchema } from '../../../../src/common/schemas.js'
import { StructError } from 'superstruct'

describe('schemas/receipts', () => {
  describe('amount', () => {
    it('should allow valid values (string)', () => {
      expect(zeroableAmountSchema.create('0')).to.eq(0)
      expect(amountSchema.create('1')).to.eq(1)
      expect(amountSchema.create('10')).to.eq(10)
      expect(amountSchema.create('1234')).to.eq(1234)
      expect(amountSchema.create('10000000')).to.eq(10000000)
    })

    it('should allow valid values (number)', () => {
      expect(zeroableAmountSchema.create(0)).to.eq(0)

      for (const value of [1, 10, 1234, 100_000_00]) {
        expect(amountSchema.create(value)).to.eq(value)
      }
    })

    it('should not allow invalid values (string)', () => {
      for (const value of [
        '-1',
        '-0.01',
        '0',
        '0.01',
        '12.34',
        '10000001',
        '9999999999999',
        'true',
        'hello world',
      ]) {
        expect(() => amountSchema.create(value)).to.throw(StructError)
      }
    })

    it('should not allow invalid values (number)', () => {
      for (const value of [
        -1,
        -0.01,
        0,
        0.01,
        12.34,
        10000001,
        9999999999999,
        true,
        { hello: 'world' },
      ]) {
        expect(() => amountSchema.create(value)).to.throw(StructError)
      }
    })
  })

  describe('stringifiedBoolean', () => {
    it('should allow valid values (string)', () => {
      expect(stringifiedBooleanSchema.create('true')).to.eq(true)
      expect(stringifiedBooleanSchema.create('false')).to.eq(false)
    })

    it('should allow valid values (boolean)', () => {
      for (const value of [true, false]) {
        expect(stringifiedBooleanSchema.create(value)).to.eq(value)
      }
    })

    it('should not allow invalid values (string)', () => {
      for (const value of [
        '1',
        '0',
        'hello world',
        '12345',
      ]) {
        expect(() => stringifiedBooleanSchema.create(value)).to.throw(StructError)
      }
    })

    it('should not allow invalid values (boolean)', () => {
      for (const value of [
        1,
        0,
        { hello: 'world' },
      ]) {
        expect(() => stringifiedBooleanSchema.create(value)).to.throw(StructError)
      }
    })
  })
})

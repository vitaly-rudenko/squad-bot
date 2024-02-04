import { expect } from 'chai'
import { amount, stringifiedBoolean } from '../../../app/schemas/common.js'
import { StructError } from 'superstruct'

describe('schemas/receipts', () => {
  describe('amount', () => {
    it('should allow valid values (string)', () => {
      expect(amount.create('0')).to.eq(0)
      expect(amount.create('10')).to.eq(10)
      expect(amount.create('1234')).to.eq(1234)
      expect(amount.create('10000000')).to.eq(10000000)
    })

    it('should allow valid values (number)', () => {
      for (const value of [0, 10, 1234, 100_000_00]) {
        expect(amount.create(value)).to.eq(value)
      }
    })

    it('should not allow invalid values (string)', () => {
      for (const value of [
        '-1',
        '-0.01',
        '0.01',
        '12.34',
        '10000001',
        '9999999999999',
        'true',
        'hello world',
      ]) {
        expect(() => amount.create(value)).to.throw(StructError)
      }
    })

    it('should not allow invalid values (number)', () => {
      for (const value of [
        -1,
        -0.01,
        0.01,
        12.34,
        10000001,
        9999999999999,
        true,
        { hello: 'world' },
      ]) {
        expect(() => amount.create(value)).to.throw(StructError)
      }
    })
  })

  describe('stringifiedBoolean', () => {
    it('should allow valid values (string)', () => {
      expect(stringifiedBoolean.create('true')).to.eq(true)
      expect(stringifiedBoolean.create('false')).to.eq(false)
    })

    it('should allow valid values (boolean)', () => {
      for (const value of [true, false]) {
        expect(stringifiedBoolean.create(value)).to.eq(value)
      }
    })

    it('should not allow invalid values (string)', () => {
      for (const value of [
        '1',
        '0',
        'hello world',
        '12345',
      ]) {
        expect(() => stringifiedBoolean.create(value)).to.throw(StructError)
      }
    })

    it('should not allow invalid values (boolean)', () => {
      for (const value of [
        1,
        0,
        { hello: 'world' },
      ]) {
        expect(() => stringifiedBoolean.create(value)).to.throw(StructError)
      }
    })
  })
})

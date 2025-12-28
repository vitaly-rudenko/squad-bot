import { describe, it, expect } from 'vitest'
import { formatAmount } from '../../src/utils/format-amount'

describe('formatAmount()', () => {
  it('formats amount', () => {
    expect(formatAmount(0)).toEqual('0')
    expect(formatAmount(50)).toEqual('0.50')
    expect(formatAmount(12)).toEqual('0.12')
    expect(formatAmount(123)).toEqual('1.23')
    expect(formatAmount(1230)).toEqual('12.30')
    expect(formatAmount(19999)).toEqual('199.99')

    expect(formatAmount(12345)).toEqual('123.45')
    expect(formatAmount(-12345)).toEqual('-123.45')
  })

  it('formats amount with UAH currency', () => {
    expect(formatAmount(0, 'UAH')).toEqual('₴0')
    expect(formatAmount(50, 'UAH')).toEqual('₴0.50')
    expect(formatAmount(12, 'UAH')).toEqual('₴0.12')
    expect(formatAmount(123, 'UAH')).toEqual('₴1.23')
    expect(formatAmount(1230, 'UAH')).toEqual('₴12.30')
    expect(formatAmount(19999, 'UAH')).toEqual('₴199.99')

    expect(formatAmount(12345, 'UAH')).toEqual('₴123.45')
    expect(formatAmount(-12345, 'UAH')).toEqual('-₴123.45')
  })

  it('throws on numbers with decimals', () => {
    expect(() => formatAmount(0.1)).toThrow()
    expect(() => formatAmount(50.00001)).toThrow()
    expect(() => formatAmount(12.34)).toThrow()
    expect(() => formatAmount(5/7)).toThrow()
    expect(() => formatAmount(1/3)).toThrow()
    expect(() => formatAmount(2/3)).toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { formatCalculations } from '../../src/receipts/format-calculations'

describe('formatCalculations()', () => {
  describe('amount', () => {
    it('basic', () => {
      expect(
        formatCalculations({
          amount: {
            error: false,
            input: '20',
            value: 20_00,
            magic: false,
          }
        })
      ).toEqual(undefined)
    })

    it('magic', () => {
      expect(
        formatCalculations({
          amount: {
            error: false,
            input: '10 + 20',
            value: 30_00,
            magic: true,
          }
        })
      ).toEqual({
        addends: ['10', '20'],
        result: '30',
      })
    })

    it('normalizes the input', () => {
      expect(
        formatCalculations({
          amount: {
            error: false,
            input: '  20.19+    133.81  - 20 * 3/2 + (  100 * 30+3   )/20  ',
            value: 274_15,
            magic: true,
          }
        })
      ).toEqual({
        addends: ['20.19', '133.81-20*3/2', '(100*30', '3)/20'],
        result: '274.15',
      })
    })
  })

  describe('tipAmount', () => {
    it('basic', () => {
      expect(
        formatCalculations({
          tipAmount: {
            error: false,
            input: '10',
            total: 10_00,
            perUser: 5_00,
            users: 2,
            magic: false,
            correction: false,
          }
        })
      ).toEqual({
        addends: ['10 / 2 users'],
        result: '5 per user',
      })
    })

    it('magic + correction', () => {
      expect(
        formatCalculations({
          tipAmount: {
            error: false,
            input: '5 + 15',
            total: 20_00,
            perUser: 6_67,
            users: 3,
            magic: true,
            correction: true,
          }
        })
      ).toEqual({
        addends: ['(5', '15) / 3 users'],
        result: '~6.67 per user',
      })
    })

    it('normalizes the input', () => {
      expect(
        formatCalculations({
          tipAmount: {
            error: false,
            input: '  20.19+    133.81  - 20 * 3/2 + (  100 * 30+3   )/20  ',
            perUser: 54_83,
            users: 5,
            total: 274_15,
            magic: true,
            correction: false,
          }
        })
      ).toEqual({
        addends: ['(20.19', '133.81-20*3/2', '(100*30', '3)/20) / 5 users'],
        result: '54.83 per user',
      })
    })
  })

  describe('sharedExpenses', () => {
    it('basic', () => {
      expect(
        formatCalculations({
          sharedExpenses: {
            error: false,
            input: '10',
            total: 10_00,
            perUser: 5_00,
            users: 2,
            magic: false,
            correction: false,
            automatic: false,
          }
        })
      ).toEqual({
        addends: ['10 / 2 users'],
        result: '5 per user',
      })
    })

    it('magic + correction', () => {
      expect(
        formatCalculations({
          sharedExpenses: {
            error: false,
            input: '5 + 15',
            total: 20_00,
            perUser: 6_67,
            users: 3,
            magic: true,
            correction: true,
            automatic: false,
          }
        })
      ).toEqual({
        addends: ['(5', '15) / 3 users'],
        result: '~6.67 per user',
      })
    })

    it('automatic', () => {
      expect(
        formatCalculations({
          sharedExpenses: {
            error: false,
            input: '',
            total: 20_00,
            perUser: 10_00,
            users: 2,
            magic: false,
            correction: false,
            automatic: true,
          }
        })
      ).toEqual({
        addends: ['20 remaining / 2 users'],
        result: '10 per user',
      })
    })

    it('normalizes the input', () => {
      expect(
        formatCalculations({
          sharedExpenses: {
            error: false,
            input: '  20.19+    133.81  - 20 * 3/2 + (  100 * 30+3   )/20  ',
            perUser: 54_83,
            users: 5,
            total: 274_15,
            magic: true,
            automatic: false,
            correction: false,
          }
        })
      ).toEqual({
        addends: ['(20.19', '133.81-20*3/2', '(100*30', '3)/20) / 5 users'],
        result: '54.83 per user',
      })
    })
  })

  describe('debt', () => {
    it('basic', () => {
      expect(
        formatCalculations({
          debt: {
            error: false,
            debtorId: 'user-1',
            input: '20',
            total: 20_00,
            magic: false,
            automatic: false,
          }
        })
      ).toEqual(undefined)
    })

    it('shared', () => {
      expect(
        formatCalculations({
          debt: {
            error: false,
            debtorId: 'user-1',
            input: '',
            shared: 10_00,
            total: 10_00,
            magic: true,
            automatic: false,
          }
        })
      ).toEqual({
        addends: ['10 shared'],
        result: '10',
      })
    })

    it('magic + shared', () => {
      expect(
        formatCalculations({
          debt: {
            error: false,
            debtorId: 'user-1',
            input: '5 + 15',
            shared: 2_00,
            total: 22_00,
            magic: true,
            automatic: false,
          }
        })
      ).toEqual({
        addends: ['5', '15', '2 shared'],
        result: '22',
      })
    })

    it('backfill', () => {
      expect(
        formatCalculations({
          debt: {
            error: false,
            debtorId: 'user-1',
            input: '',
            backfill: 20_00,
            total: 20_00,
            magic: false,
            automatic: true,
          }
        })
      ).toEqual({
        addends: ['20 remaining'],
        result: '20',
      })
    })

    it('backfill + shared', () => {
      expect(
        formatCalculations({
          debt: {
            error: false,
            debtorId: 'user-1',
            input: '',
            backfill: 20_00,
            shared: 10_00,
            total: 30_00,
            magic: false,
            automatic: true,
          }
        })
      ).toEqual({
        addends: ['20 remaining', '10 shared'],
        result: '30',
      })
    })

    it('normalizes the input', () => {
      expect(
        formatCalculations({
          debt: {
            error: false,
            debtorId: 'user-1',
            input: '  20.19+    133.81  - 20 * 3/2 + (  100 * 30+3   )/20  ',
            total: 274_15,
            magic: true,
            automatic: false,
          }
        })
      ).toEqual({
        addends: ['20.19', '133.81-20*3/2', '(100*30', '3)/20'],
        result: '274.15',
      })
    })
  })
})

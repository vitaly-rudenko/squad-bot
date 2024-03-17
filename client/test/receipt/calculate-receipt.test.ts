import { describe, expect, it } from 'vitest'
import { calculateReceipt } from '../../src/receipts/calculate-receipt'

function debts(input: Record<string, string>): { debtorId: string; amount: string }[] {
  return Object.entries(input).map(([debtorId, amount]) => ({ debtorId, amount }))
}

describe('calculateReceipt()', () => {
  it('calculates the complete receipts', () => {
    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '15',
        debts: debts({
          'user-1': '30',
          'user-2': '35',
          'user-3': '20',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "shared": 500,
            "total": 3500,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "35",
            "magic": false,
            "shared": 500,
            "total": 4000,
          },
          {
            "automatic": false,
            "debtorId": "user-3",
            "error": false,
            "input": "20",
            "magic": false,
            "shared": 500,
            "total": 2500,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "15",
          "magic": false,
          "perUser": 500,
          "total": 1500,
          "users": 3,
        },
        "total": 10000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        tipAmount: '30',
        sharedExpenses: '15',
        debts: debts({
          'user-1': '30',
          'user-2': '35',
          'user-3': '20',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "shared": 500,
            "tip": 1000,
            "total": 3500,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "35",
            "magic": false,
            "shared": 500,
            "tip": 1000,
            "total": 4000,
          },
          {
            "automatic": false,
            "debtorId": "user-3",
            "error": false,
            "input": "20",
            "magic": false,
            "shared": 500,
            "tip": 1000,
            "total": 2500,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "15",
          "magic": false,
          "perUser": 500,
          "total": 1500,
          "users": 3,
        },
        "tipAmount": {
          "correction": false,
          "error": false,
          "input": "30",
          "magic": false,
          "perUser": 1000,
          "total": 3000,
          "users": 3,
        },
        "total": 13000,
      }
    `)
  })

  it('splits everything evenly in empty receipts', () => {
    expect(
      calculateReceipt({
        amount: '75',
        sharedExpenses: '',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "75",
          "magic": false,
          "value": 7500,
        },
        "debts": [
          {
            "automatic": true,
            "debtorId": "user-1",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 2500,
            "total": 2500,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 2500,
            "total": 2500,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 2500,
            "total": 2500,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": false,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 2500,
          "total": 7500,
          "users": 3,
        },
        "total": 7500,
      }
    `)
  })

  it('splits remaining amount evenly in partially empty receipts', () => {
    expect(
      calculateReceipt({
        amount: '75',
        sharedExpenses: '',
        debts: debts({
          'user-1': '15',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "75",
          "magic": false,
          "value": 7500,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "15",
            "magic": false,
            "shared": 2000,
            "total": 3500,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 2000,
            "total": 2000,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 2000,
            "total": 2000,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": false,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 2000,
          "total": 6000,
          "users": 3,
        },
        "total": 7500,
      }
    `)
  })

  it('splits remaining amount instead of backfilling it', () => {
    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '',
        debts: debts({
          'user-1': '75',
          'user-2': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "75",
            "magic": false,
            "shared": 1250,
            "total": 8750,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 1250,
            "total": 1250,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": false,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 1250,
          "total": 2500,
          "users": 2,
        },
        "total": 10000,
      }
    `)
  })

  it('backfills a single empty user', () => {
    expect(
      calculateReceipt({
        amount: '75',
        debts: debts({
          'user-1': '30',
          'user-2': '40',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "75",
          "magic": false,
          "value": 7500,
        },
        "backfillAmount": 500,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "total": 3000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "40",
            "magic": false,
            "total": 4000,
          },
          {
            "automatic": true,
            "backfill": 500,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "total": 500,
          },
        ],
        "error": false,
        "total": 7500,
      }
    `)

    expect(
      calculateReceipt({
        amount: '75',
        debts: debts({
          'user-1': '30',
          'user-2': '40',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "75",
          "magic": false,
          "value": 7500,
        },
        "backfillAmount": 500,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "total": 3000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "40",
            "magic": false,
            "total": 4000,
          },
          {
            "automatic": true,
            "backfill": 500,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "total": 500,
          },
        ],
        "error": false,
        "total": 7500,
      }
    `)
  })

  it('backfills even when shared expenses is provided', () => {
    expect(
      calculateReceipt({
        amount: '80',
        sharedExpenses: '6',
        debts: debts({
          'user-1': '30',
          'user-2': '40',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "80",
          "magic": false,
          "value": 8000,
        },
        "backfillAmount": 400,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "shared": 200,
            "total": 3200,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "40",
            "magic": false,
            "shared": 200,
            "total": 4200,
          },
          {
            "automatic": true,
            "backfill": 400,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 200,
            "total": 600,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "6",
          "magic": false,
          "perUser": 200,
          "total": 600,
          "users": 3,
        },
        "total": 8000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '80',
        sharedExpenses: '10',
        debts: debts({
          'user-1': '30',
          'user-2': '40',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "80",
          "magic": false,
          "value": 8000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "shared": 333,
            "total": 3333,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "40",
            "magic": false,
            "shared": 333,
            "total": 4333,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 334,
            "total": 334,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": false,
          "correction": true,
          "error": false,
          "input": "10",
          "magic": false,
          "perUser": 333,
          "total": 1000,
          "users": 3,
        },
        "total": 8000,
      }
    `)
  })

  it('does not backfill when shared expenses are provided with amount mismatch', () => {
    expect(
      calculateReceipt({
        amount: '80',
        sharedExpenses: '21',
        debts: debts({
          'user-1': '30',
          'user-2': '40',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "80",
          "magic": false,
          "value": 8000,
        },
        "amountMismatch": -1100,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "shared": 700,
            "total": 3700,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "40",
            "magic": false,
            "shared": 700,
            "total": 4700,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 700,
            "total": 700,
          },
        ],
        "error": true,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "21",
          "magic": false,
          "perUser": 700,
          "total": 2100,
          "users": 3,
        },
        "total": 8000,
      }
    `)
  })

  it('backfills properly even when error', () => {
    expect(
      calculateReceipt({
        amount: '75',
        tipAmount: '-100',
        debts: debts({
          'user-1': '30',
          'user-2': '40',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "75",
          "magic": false,
          "value": 7500,
        },
        "backfillAmount": 500,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "total": 3000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "40",
            "magic": false,
            "total": 4000,
          },
          {
            "automatic": true,
            "backfill": 500,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "total": 500,
          },
        ],
        "error": true,
        "tipAmount": {
          "error": true,
          "input": "-100",
        },
        "total": 7500,
      }
    `)
  })

  it('does not split shared expenses when not enabled', () => {
    expect(
      calculateReceipt({
        amount: '100',
        debts: debts({
          'user-1': '30',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": 7000,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "30",
            "magic": false,
            "total": 3000,
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)
  })

  it('parses magic values', () => {
    expect(
      calculateReceipt({
        amount: '100.50-25+5', // 80.50
        tipAmount: '60/(2+1)+1', // 21
        sharedExpenses: '10/2 + 10', // 15
        debts: debts({
          'user-1': '10 - 5+30', // 35
          'user-2': '10+1+1.25+1.25+1+2/2', // 15.50
          'user-3': '3*5+0', // 15
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100.50-25+5",
          "magic": true,
          "value": 8050,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "10 - 5+30",
            "magic": true,
            "shared": 500,
            "tip": 700,
            "total": 4000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "10+1+1.25+1.25+1+2/2",
            "magic": true,
            "shared": 500,
            "tip": 700,
            "total": 2050,
          },
          {
            "automatic": false,
            "debtorId": "user-3",
            "error": false,
            "input": "3*5+0",
            "magic": true,
            "shared": 500,
            "tip": 700,
            "total": 2000,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "10/2 + 10",
          "magic": true,
          "perUser": 500,
          "total": 1500,
          "users": 3,
        },
        "tipAmount": {
          "correction": false,
          "error": false,
          "input": "60/(2+1)+1",
          "magic": true,
          "perUser": 700,
          "total": 2100,
          "users": 3,
        },
        "total": 10150,
      }
    `)
  })

  it('parses magic values (edge cases)', () => {
    expect(
      calculateReceipt({
        amount: '100',
        debts: debts({
          'user-1': '70',
          'user-2': '(10+20)',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "70",
            "magic": false,
            "total": 7000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "(10+20)",
            "magic": true,
            "total": 3000,
          },
        ],
        "error": false,
        "total": 10000,
      }
    `)
  })

  it('fails to parse invalid values', () => {
    expect(
      calculateReceipt({
        amount: 'hello world',
        sharedExpenses: '123abc',
        debts: debts({
          'user-1': '&*&^#$(*#)_#($',
          'user-2': '100.100101.010101010.10',
          'user-3': 'eeefefefefe',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": true,
          "input": "hello world",
        },
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "&*&^#$(*#)_#($",
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "100.100101.010101010.10",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "eeefefefefe",
          },
        ],
        "error": true,
        "sharedExpenses": {
          "error": true,
          "input": "123abc",
        },
      }
    `)
  })

  it('handles special case when no users are enabled', () => {
    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '',
        debts: []
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [],
        "error": false,
        "total": 10000,
      }
    `)
  })

  it('marks negative values as invalid', () => {
    expect(
      calculateReceipt({
        amount: '-100',
        sharedExpenses: '-50',
        debts: debts({
          'user-1': '-10',
          'user-2': '-0.5',
          'user-3': '-30.5',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": true,
          "input": "-100",
        },
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "-10",
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "-0.5",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "-30.5",
          },
        ],
        "error": true,
        "sharedExpenses": {
          "error": true,
          "input": "-50",
        },
      }
    `)

    expect(
      calculateReceipt({
        amount: '-100',
        sharedExpenses: '',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": true,
          "input": "-100",
        },
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '-50',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "sharedExpenses": {
          "error": true,
          "input": "-50",
        },
        "total": 10000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '75',
        debts: debts({
          'user-1': '-50',
          'user-2': '20',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "-50",
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "20",
            "magic": false,
            "shared": 2500,
            "total": 4500,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 2500,
            "total": 2500,
          },
        ],
        "error": true,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "75",
          "magic": false,
          "perUser": 2500,
          "total": 7500,
          "users": 3,
        },
        "total": 10000,
      }
    `)
  })

  it('does not backfill a single user', () => {
    expect(
      calculateReceipt({
        amount: '100',
        debts: debts({
          'user-1': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": 10000,
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)
  })

  it('calculates amount mismatch (under)', () => {
    expect(
      calculateReceipt({
        amount: '100',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": 10000,
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        debts: debts({
          'user-1': '75',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": 2500,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "75",
            "magic": false,
            "total": 7500,
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        debts: debts({
          'user-1': '20',
          'user-2': '5 + 5', // 10
          'user-3': '50.5',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": 1950,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "20",
            "magic": false,
            "total": 2000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "5 + 5",
            "magic": true,
            "total": 1000,
          },
          {
            "automatic": false,
            "debtorId": "user-3",
            "error": false,
            "input": "50.5",
            "magic": false,
            "total": 5050,
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)
  })

  it('calculates amount mismatch (over)', () => {
    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '150',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": -5000,
        "debts": [
          {
            "automatic": true,
            "debtorId": "user-1",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 5000,
            "total": 5000,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 5000,
            "total": 5000,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 5000,
            "total": 5000,
          },
        ],
        "error": true,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "150",
          "magic": false,
          "perUser": 5000,
          "total": 15000,
          "users": 3,
        },
        "total": 10000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '3',
        debts: debts({
          'user-1': '100',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": -300,
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "100",
            "magic": false,
            "shared": 100,
            "total": 10100,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 100,
            "total": 100,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 100,
            "total": 100,
          },
        ],
        "error": true,
        "sharedExpenses": {
          "automatic": false,
          "correction": false,
          "error": false,
          "input": "3",
          "magic": false,
          "perUser": 100,
          "total": 300,
          "users": 3,
        },
        "total": 10000,
      }
    `)
  })

  it('handles edge cases', () => {
    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '',
        debts: debts({
          'user-1': '101',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "101",
            "magic": false,
            "total": 10100,
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-3",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)
  })

  it('does not yield unnecessary errors', () => {
    expect(
      calculateReceipt({
        amount: '',
        sharedExpenses: '',
        debts: [],
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": true,
          "input": "",
        },
        "debts": [],
        "error": true,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        sharedExpenses: '',
        debts: [],
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [],
        "error": false,
        "total": 10000,
      }
    `)
  })

  it('splits non-dividable costs and corrections properly', () => {
    expect(
      calculateReceipt({
        amount: '140',
        sharedExpenses: '',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "140",
          "magic": false,
          "value": 14000,
        },
        "debts": [
          {
            "automatic": true,
            "debtorId": "user-1",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 4667,
            "total": 4667,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 4667,
            "total": 4667,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 4666,
            "total": 4666,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": true,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 4667,
          "total": 14000,
          "users": 3,
        },
        "total": 14000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '25.25',
        sharedExpenses: '',
        debts: debts({
          'user-1': '',
          'user-2': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "25.25",
          "magic": false,
          "value": 2525,
        },
        "debts": [
          {
            "automatic": true,
            "debtorId": "user-1",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 1263,
            "total": 1263,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 1262,
            "total": 1262,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": true,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 1263,
          "total": 2525,
          "users": 2,
        },
        "total": 2525,
      }
    `)

    expect(
      calculateReceipt({
        amount: '5',
        sharedExpenses: '',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
          'user-4': '',
          'user-5': '',
          'user-6': '',
          'user-7': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "5",
          "magic": false,
          "value": 500,
        },
        "debts": [
          {
            "automatic": true,
            "debtorId": "user-1",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 71,
            "total": 71,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 71,
            "total": 71,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 71,
            "total": 71,
          },
          {
            "automatic": true,
            "debtorId": "user-4",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 71,
            "total": 71,
          },
          {
            "automatic": true,
            "debtorId": "user-5",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 71,
            "total": 71,
          },
          {
            "automatic": true,
            "debtorId": "user-6",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 71,
            "total": 71,
          },
          {
            "automatic": true,
            "debtorId": "user-7",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 74,
            "total": 74,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": true,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 71,
          "total": 500,
          "users": 7,
        },
        "total": 500,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        tipAmount: '20',
        sharedExpenses: '',
        debts: debts({
          'user-1': '',
          'user-2': '',
          'user-3': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": true,
            "debtorId": "user-1",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 3333,
            "tip": 667,
            "total": 3333,
          },
          {
            "automatic": true,
            "debtorId": "user-2",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 3333,
            "tip": 667,
            "total": 3333,
          },
          {
            "automatic": true,
            "debtorId": "user-3",
            "error": false,
            "input": "",
            "magic": false,
            "shared": 3334,
            "tip": 666,
            "total": 3334,
          },
        ],
        "error": false,
        "sharedExpenses": {
          "automatic": true,
          "correction": true,
          "error": false,
          "input": "",
          "magic": false,
          "perUser": 3333,
          "total": 10000,
          "users": 3,
        },
        "tipAmount": {
          "correction": true,
          "error": false,
          "input": "20",
          "magic": false,
          "perUser": 667,
          "total": 2000,
          "users": 3,
        },
        "total": 12000,
      }
    `)
  })

  it('should not include tip when it\'s zero', () => {
    expect(
      calculateReceipt({
        amount: '100',
        tipAmount: '0',
        debts: debts({
          'user-1': '50',
          'user-2': '50',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "debts": [
          {
            "automatic": false,
            "debtorId": "user-1",
            "error": false,
            "input": "50",
            "magic": false,
            "total": 5000,
          },
          {
            "automatic": false,
            "debtorId": "user-2",
            "error": false,
            "input": "50",
            "magic": false,
            "total": 5000,
          },
        ],
        "error": false,
        "total": 10000,
      }
    `)

    expect(
      calculateReceipt({
        amount: '100',
        tipAmount: '0',
        debts: debts({
          'user-1': '',
          'user-2': '',
        }),
      })
    ).toMatchInlineSnapshot(`
      {
        "amount": {
          "error": false,
          "input": "100",
          "magic": false,
          "value": 10000,
        },
        "amountMismatch": 10000,
        "debts": [
          {
            "debtorId": "user-1",
            "error": true,
            "input": "",
          },
          {
            "debtorId": "user-2",
            "error": true,
            "input": "",
          },
        ],
        "error": true,
        "total": 10000,
      }
    `)
  })
})

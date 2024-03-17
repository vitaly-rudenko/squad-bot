import { isDefined } from '@/utils/is-defined'
import { parseMagicalAmount, isMagicalAmount } from '@/utils/magic'

export function calculateReceipt(input: CalculateReceiptInput): CalculatedReceipt {
  const amount = parseMagicalAmount(input.amount, undefined)

  const tipAmount = parseMagicalAmount(input.tipAmount, undefined)
  const [tipAmountPerUser, tipAmountPerUserWithCorrection] = isDefined(tipAmount) && input.debts.length > 0
    ? divideBy(tipAmount, input.debts.length)
    : [undefined, undefined]

  const total = isDefined(amount)
    ? isDefined(tipAmount) ? amount + tipAmount : amount
    : undefined

  const debtAmounts = input.debts.map(d => parseMagicalAmount(d.amount, 0))
  const totalDebtAmount = debtAmounts.reduce((sum, amount) => sum + amount, 0)
  const remaining = isDefined(amount) && amount > totalDebtAmount
    ? amount - totalDebtAmount
    : undefined

  const containsInvalidDebtAmounts = input.debts.some(d => d.amount !== '' && !isDefined(parseMagicalAmount(d.amount, undefined)))

  const emptyDebts = input.debts.filter(d => d.amount === '')
  const backfillDebt = !containsInvalidDebtAmounts && input.debts.length > 1 && emptyDebts.length === 1 && input.sharedExpenses !== ''
    ? emptyDebts.at(0)
    : undefined

  const sharedExpenses = isDefined(input.sharedExpenses)
    ? parseMagicalAmount(input.sharedExpenses, input.sharedExpenses === '' ? remaining : undefined)
    : undefined
  const [sharedExpensesPerUser, sharedExpensesPerUserWithCorrection] = isDefined(sharedExpenses) && input.debts.length > 0
    ? divideBy(sharedExpenses, input.debts.length)
    : [undefined, undefined]

  const backfillAmount = backfillDebt
    ? Math.max(0, (remaining ?? 0) - (sharedExpenses ?? 0))
    : 0

  const debts: CalculatedReceipt['debts'] = input.debts.map((debt, i) => {
    const isLastDebt = i === input.debts.length - 1
    const sharedWithCorrection = isLastDebt ? sharedExpensesPerUserWithCorrection : undefined
    const tipWithCorrection = isLastDebt ? tipAmountPerUserWithCorrection : undefined

    const initial = parseMagicalAmount(debt.amount, undefined)
    const backfill = backfillDebt === debt ? backfillAmount : undefined
    const shared = sharedWithCorrection ?? sharedExpensesPerUser
    const total = [initial, backfill, shared].reduce<number>((a, b) => a + (b ?? 0), 0)
    const error = !isDefined(initial) && (debt.amount !== '' || total === 0)

    return error ? {
      debtorId: debt.debtorId,
      input: debt.amount,
      error: true,
    } :{
      error: false,
      debtorId: debt.debtorId,
      input: debt.amount,
      total,
      magic: isMagicalAmount(debt.amount),
      automatic: debt.amount === '' && total > 0,
      ...isDefined(tipAmountPerUser) && tipAmountPerUser > 0 && { tip: tipWithCorrection ?? tipAmountPerUser },
      ...isDefined(shared) && { shared },
      ...isDefined(backfill) && backfill > 0 && { backfill },
    }
  })

  const amountMismatch = isDefined(amount) && debts.length > 0 && (debts.every(d => !d.error) || !isDefined(input.sharedExpenses))
    ? (amount - debts.reduce((sum, debt) => sum + (debt.error ? 0 : debt.total), 0))
    : 0

  const amountError = isDefined(input.amount) && !isDefined(amount)
  const tipAmountError = isDefined(input.tipAmount) && (!isDefined(tipAmount) || input.debts.length === 0)
  const sharedExpensesError = input.amount !== '' && isDefined(input.sharedExpenses) && input.sharedExpenses !== '' && !isDefined(sharedExpenses)
  const debtsError = !debts.every((debt): debt is Debt => !debt.error)
  const isError = (
    !isDefined(total) ||
    !isDefined(amount) ||
    tipAmountError ||
    sharedExpensesError ||
    debtsError ||
    amountMismatch !== 0
  )

  if (!isError) {
    return {
      error: false,
      total,
      ...backfillAmount !== 0 && { backfillAmount },
      amount: {
        error: false,
        input: input.amount,
        value: amount,
        magic: isMagicalAmount(input.amount),
      },
      ...isDefined(tipAmount) && isDefined(tipAmountPerUser) && tipAmount > 0 && {
        tipAmount: {
        error: false,
        input: input.tipAmount!,
          perUser: tipAmountPerUser,
          users: input.debts.length,
          total: tipAmount,
          correction: isDefined(tipAmountPerUserWithCorrection),
          magic: isMagicalAmount(input.tipAmount),
        }
      },
      ...isDefined(sharedExpenses) && isDefined(sharedExpensesPerUser) && {
        sharedExpenses: {
        error: false,
        input: input.sharedExpenses!,
          perUser: sharedExpensesPerUser,
          users: input.debts.length,
          total: sharedExpenses,
          magic: isMagicalAmount(input.sharedExpenses),
          automatic: input.sharedExpenses === '' && sharedExpenses > 0,
          correction: isDefined(sharedExpensesPerUserWithCorrection),
        }
      },
      debts,
    }
  }

  return {
    error: true,
    ...isDefined(total) && { total },
    ...(amountMismatch !== 0 && { amountMismatch }) || (backfillAmount !== 0 && { backfillAmount }),
    ...input.amount !== '' && isDefined(amount) && {
      amount: {
        error: false,
        value: amount,
        input: input.amount,
        magic: isMagicalAmount(input.amount),
      }
    },
    ...amountError && {
      amount: {
        input: input.amount,
        error: true,
      }
    },
    ...isDefined(tipAmount) && isDefined(tipAmountPerUser) && tipAmount > 0 && {
      tipAmount: {
        error: false,
        input: input.tipAmount!,
        perUser: tipAmountPerUser,
        users: input.debts.length,
        total: tipAmount,
        correction: isDefined(tipAmountPerUserWithCorrection),
        magic: isMagicalAmount(input.tipAmount),
      }
    },
    ...tipAmountError && {
      tipAmount: {
        input: input.tipAmount!,
        error: true
      }
    },
    ...isDefined(sharedExpenses) && isDefined(sharedExpensesPerUser) && {
      sharedExpenses: {
        error: false,
        input: input.sharedExpenses!,
        perUser: sharedExpensesPerUser,
        users: input.debts.length,
        total: sharedExpenses,
        magic: isMagicalAmount(input.sharedExpenses),
        automatic: input.sharedExpenses === '' && sharedExpenses > 0,
        correction: isDefined(sharedExpensesPerUserWithCorrection),
      }
    },
    ...sharedExpensesError && {
      sharedExpenses: {
        input: input.sharedExpenses!,
        error: true,
      }
    },
    debts,
  }
}

function divideBy(amount: number, n: number): [number, number | undefined] {
  const divided = amount / n
  const rounded = Math.round(divided)
  const remaining = amount - rounded * n

  return [rounded, remaining !== 0 ? rounded + remaining : undefined]
}

type CalculateReceiptInput = {
  amount: string
  tipAmount?: string
  sharedExpenses?: string
  debts: {
    debtorId: string
    amount: string
  }[]
}

type CalculatedReceipt = {
  error: false
  total: number
  backfillAmount?: number
  amountMismatch: undefined
  amount: Amount
  tipAmount?: TipAmount
  sharedExpenses?: SharedExpenses
  debts: Debt[]
} | {
  error: true
  total?: number
  backfillAmount?: number
  amountMismatch?: number
  amount?: Amount | {
    error: true
    input: string
  }
  tipAmount?: TipAmount | {
    error: true
    input: string
  }
  sharedExpenses?: SharedExpenses | {
    error: true
    input: string
  }
  debts: (Debt | {
    error: true
    input: string
    debtorId: string
  })[]
}

export type Amount = {
  error: false
  input: string
  value: number
  magic: boolean
}

export type TipAmount = {
  error: false
  input: string
  perUser: number
  users: number
  total: number
  correction: boolean
  magic: boolean
}

export type SharedExpenses = {
  error: false
  input: string
  perUser: number
  users: number
  total: number
  magic: boolean
  automatic: boolean
  correction: boolean
}

export type Debt = {
  error: false
  debtorId: string
  input: string
  tip?: number
  total: number
  shared?: number
  backfill?: number
  magic: boolean
  automatic: boolean
}

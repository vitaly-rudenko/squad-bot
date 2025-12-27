import { formatAmount } from '@/utils/format-amount'
import type { Debt, Amount, TipAmount, SharedExpenses } from './calculate-receipt'
import { isTruthy } from '@/utils/is-truthy'

type Translations = {
  users: string
  remaining: string
  shared: string
  perUser: string
}

export function formatCalculations(
  input:
    | { debt: Debt }
    | { amount: Amount }
    | { tipAmount: TipAmount }
    | { sharedExpenses: SharedExpenses },
  translations: Translations = {
    users: 'users',
    remaining: 'remaining',
    shared: 'shared',
    perUser: 'per user',
  }
): { addends: string[]; result: string } | undefined {
  if ('amount' in input) {
    if (!input.amount.magic) return undefined

    return {
      addends: normalizeInput(input.amount.input).split('+').map(p => p.trim()),
      result: formatAmount(input.amount.value),
    }
  }

  if ('tipAmount' in input) {
    const normalized = normalizeInput(input.tipAmount.input)
    const wrapped = input.tipAmount.magic ? `(${normalized})` : normalized

    return {
      addends: `${wrapped} / ${input.tipAmount.users} ${translations.users}`.split('+').map(p => p.trim()),
      result: `${input.tipAmount.correction ? '~' : ''}${formatAmount(input.tipAmount.perUser)} ${translations.perUser}`
    }
  }

  if ('sharedExpenses' in input) {
    const source = input.sharedExpenses.automatic
      ? `${formatAmount(input.sharedExpenses.total)} ${translations.remaining}`
      : normalizeInput(input.sharedExpenses.input)

    const wrapped = input.sharedExpenses.magic ? `(${source})` : source

    return {
      addends: `${wrapped} / ${input.sharedExpenses.users} ${translations.users}`.split('+').map(p => p.trim()),
      result: `${input.sharedExpenses.correction ? '~' : ''}${formatAmount(input.sharedExpenses.perUser)} ${translations.perUser}`
    }
  }

  if ('debt' in input) {
    if (!input.debt.magic && !('backfill' in input.debt) && !('shared' in input.debt)) return undefined

    return {
      addends: [
        ...normalizeInput(input.debt.input).split('+').map(p => p.trim()),
        input.debt.backfill && `${formatAmount(input.debt.backfill)} ${translations.remaining}`,
        input.debt.shared && `${formatAmount(input.debt.shared)} ${translations.shared}`,
      ].filter(isTruthy),
      result: formatAmount(input.debt.total),
    }
  }

  throw new Error('Invalid input')
}

function normalizeInput(input: string) {
  return input.replaceAll(/\s+/g, '')
}

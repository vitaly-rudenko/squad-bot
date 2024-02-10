import { refine, coerce, number, string, boolean, nonempty, trimmed } from 'superstruct'

export const userIdSchema = nonempty(string())
export const groupIdSchema = nonempty(string())

export const amountSchema = refine(
  coerce(number(), trimmed(string()), (value) => Number(value)),
  'amount',
  (value) => (
    Number.isInteger(value) && value >= 0 && value <= 100_000_00 ||
    `Expected 'amount' to be a positive integer less than 100,000,00`
  )
)

export const stringifiedBooleanSchema = coerce(boolean(), string(), (value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
})

import { refine, coerce, number, string, boolean } from 'superstruct'

export const amount = refine(
  coerce(number(), string(), (value) => Number(value)),
  'amount',
  (value) => (
    Number.isInteger(value) && value >= 0 && value <= 100_000_00 ||
    `Expected 'amount' to be a positive integer less than 100,000,00`
  )
)

export const stringifiedBoolean = coerce(boolean(), string(), (value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
})

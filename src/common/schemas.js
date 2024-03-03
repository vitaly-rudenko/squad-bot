import { refine, coerce, number, string, boolean, nonempty, trimmed, min, type, size, defaulted } from 'superstruct'

export const userIdSchema = nonempty(string())
export const groupIdSchema = nonempty(string())

export const amountSchema = refine(
  coerce(number(), trimmed(string()), (value) => Number(value)),
  'amount',
  (value) => (
    Number.isSafeInteger(value) && value > 0 && value <= 100_000_00 ||
    `Expected 'amount' to be a natural number less than 100,000,00`
  )
)

export const stringifiedBooleanSchema = coerce(boolean(), string(), (value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
})

const stringifiedInteger = refine(
  coerce(number(), string(), (value) => Number(value)),
  'integer',
  (value) => Number.isSafeInteger(value)
)

export const paginationSchema = type({
  page: defaulted(min(stringifiedInteger, 1), 1),
  per_page: defaulted(size(stringifiedInteger, 1, 100), 100),
})

import { object, optional, string, size, coerce, array } from 'superstruct'
import { amount, stringifiedBoolean } from './common.js'

export const debt = object({ debtorId: string(), amount })
export const debts = coerce(
  array(debt), string(),
  (value) => (
    Object.entries(JSON.parse(value))
      .map(([debtorId, amount]) => ({ debtorId, amount }))
  )
)

export const saveReceiptSchema = object({
  id: optional(string()),
  payer_id: string(),
  description: optional(size(string(), 1, 64)),
  amount,
  debts: size(debts, 1, 10),
  leave_photo: optional(stringifiedBoolean),
})

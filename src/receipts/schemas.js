import { object, coerce, array, string, optional, size, trimmed, any, type, union, literal } from 'superstruct'
import { userIdSchema, amountSchema, stringifiedBooleanSchema } from '../common/schemas.js'

export const debtSchema = object({
  debtorId: userIdSchema,
  amount: amountSchema,
})

export const debtsSchema = coerce(
  array(debtSchema),
  string(),
  (value) => (
    Object.entries(JSON.parse(value))
      .map(([debtorId, amount]) => ({ debtorId, amount }))
  )
)

export const saveReceiptSchema = object({
  id: optional(string()),
  payer_id: string(),
  description: optional(size(trimmed(string()), 1, 64)),
  amount: amountSchema,
  debts: size(debtsSchema, 1, 10),
  leave_photo: optional(stringifiedBooleanSchema),
})

export const photoSchema = type({
  buffer: any(),
  mimetype: union([literal('image/jpeg'), literal('image/png')]),
})

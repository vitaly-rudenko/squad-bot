import { object, coerce, array, string, optional, size, trimmed, type, union, literal, define } from 'superstruct'
import { userIdSchema, amountSchema, stringifiedBooleanSchema, zeroableAmountSchema } from '../common/schemas.js'
import { MAX_DEBTS_PER_RECEIPT } from '../debts/constants.js'

export const debtSchema = object({
  debtorId: userIdSchema,
  amount: zeroableAmountSchema,
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
  debts: size(debtsSchema, 1, MAX_DEBTS_PER_RECEIPT),
  leave_photo: optional(stringifiedBooleanSchema),
})

export const photoSchema = type({
  buffer: /** @type {typeof define<Buffer>} */ (define)('buffer', (value) => value instanceof Buffer),
  mimetype: union([literal('image/jpeg'), literal('image/png')]),
})

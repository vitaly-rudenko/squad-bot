import { refine, number, array, size, trimmed, string, union, literal, nonempty, object, boolean, optional } from 'superstruct'
import { userIdSchema, groupIdSchema } from '../common/schemas.js'

export const sortOrderSchema = refine(number(), 'natural', (value) => Number.isSafeInteger(value) && value > 0)
export const pollOptionsSchema = array(size(trimmed(string()), 1, 32))
export const messagePatternSchema = size(trimmed(string()), 1, 256)
export const usersPatternSchema = union([
  literal('*'),
  refine(
    nonempty(string()),
    'users pattern',
    (value) => value.split(',').every(userId => userIdSchema.is(userId))
  ),
])

export const createRollCallSchema = object({
  groupId: groupIdSchema,
  messagePattern: messagePatternSchema,
  usersPattern: usersPatternSchema,
  excludeSender: boolean(),
  pollOptions: pollOptionsSchema,
  sortOrder: sortOrderSchema,
})

export const updateRollCallSchema = object({
  messagePattern: optional(messagePatternSchema),
  usersPattern: optional(usersPatternSchema),
  excludeSender: optional(boolean()),
  pollOptions: optional(pollOptionsSchema),
  sortOrder: optional(sortOrderSchema),
})

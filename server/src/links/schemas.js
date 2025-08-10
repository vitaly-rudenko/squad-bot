import { object, size, string, trimmed } from 'superstruct'
import { groupIdSchema } from '../common/schemas.js'

export const labelSchema = size(trimmed(string()), 1, 64)
export const urlSchema = size(trimmed(string()), 1, 2048)

export const createLinkSchema = object({
  groupId: groupIdSchema,
  label: labelSchema,
  url: urlSchema,
})

export const updateLinkSchema = object({
  label: labelSchema,
  url: urlSchema,
})

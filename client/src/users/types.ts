import { Infer, literal, optional, string, type, union } from 'superstruct'

export const userSchema = type({
  id: string(),
  name: string(),
  username: optional(string()),
  locale: union([literal('en'), literal('uk')]),
})

export type User = Infer<typeof userSchema>

import type { Infer } from 'superstruct'
import type { localeFileSchema } from './schemas'

type ObjectKey<T, A = keyof T> = T extends Record<string, unknown>
  ? A extends string
    ? `${A}${T[A] extends Record<string, unknown> ? '.' : ''}${ObjectKey<T[A]>}`
    : ''
  : ''

export type Locale = 'en' | 'uk'

export type MessageKey = ObjectKey<Infer<typeof localeFileSchema>>

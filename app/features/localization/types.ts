import type { Infer } from 'superstruct'
import type { localeFileSchema } from './schemas'

export type Locale = 'en' | 'uk'

export type LocaleFile = Infer<typeof localeFileSchema>

type Key<T, A = keyof T> = T extends Record<string, unknown>
  ? A extends string
    ? `${A}${T[A] extends Record<string, unknown> ? '.' : ''}${Key<T[A]>}`
    : ''
  : ''

export type MessageKey = Key<LocaleFile>

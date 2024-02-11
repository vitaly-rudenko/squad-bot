import type { Infer } from 'superstruct'
import type { photoSchema } from './schemas'

export type Receipt = {
  id: string
  payerId: string
  amount: number
  description?: string
  photoFilename?: string
  createdAt: Date
}

export type Photo = Infer<typeof photoSchema>

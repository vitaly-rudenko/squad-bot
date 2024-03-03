import type { Infer } from 'superstruct'
import type { photoSchema, saveReceiptSchema } from './schemas'

export type Receipt = {
  id: string
  payerId: string
  amount: number
  description?: string
  photoFilename?: string
  createdAt: Date
}

export type ReceiptWithDebts = Receipt & {
  debts: { debtorId: string; amount: number }[]
}

export type Photo = Infer<typeof photoSchema>

export type SaveReceiptInput = Infer<typeof saveReceiptSchema>

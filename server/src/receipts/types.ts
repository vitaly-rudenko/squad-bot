import type { Infer } from 'superstruct'
import type { saveReceiptSchema } from './schemas'

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

export type Photo = {
  buffer: Buffer
  mimetype: string
}

export type SaveReceiptInput = Infer<typeof saveReceiptSchema>

export type ScanResult = {
  amount: number
  score: number
}

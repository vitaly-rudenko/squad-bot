export type Receipt = {
  id: string
  amount: number
  payerId: string
  description?: string | undefined
  photoFilename?: string
  debts: { debtorId: string; amount: number }[]
  createdAt: Date
}

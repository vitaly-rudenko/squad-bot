export type Receipt = {
  id: string
  payerId: string
  amount: number
  description?: string
  hasPhoto: boolean
  createdAt: Date
}

export type ReceiptPhoto = {
  binary: Buffer
  mime: string
}

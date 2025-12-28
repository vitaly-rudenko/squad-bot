export type Payment = {
  id: string
  fromUserId: string
  toUserId: string
  amount: number
  description?: string
  createdAt: Date
}

export type AggregatedPayment = {
  fromUserId: string
  toUserId: string
  amount: number
}

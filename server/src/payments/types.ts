export type Payment = {
  id: string
  fromUserId: string
  toUserId: string
  amount: number
  createdAt: Date
}

export type AggregatedPayment = {
  fromUserId: string
  toUserId: string
  amount: number
}

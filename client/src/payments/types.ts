export type Payment = {
  id: string
  amount: number
  description?: string
  fromUserId: string
  toUserId: string
  createdAt: Date
}

export type Debt = {
  id: string
  debtorId: string
  receiptId: string
  amount: number
}

export type AggregatedDebt = {
  fromUserId: string
  toUserId: string
  amount: number
}

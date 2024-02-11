export type Debt = {
  debtorId: string
  receiptId: string
  amount: number
}

export type AggregatedDebt = {
  fromUserId: string
  toUserId: string
  amount: number
}

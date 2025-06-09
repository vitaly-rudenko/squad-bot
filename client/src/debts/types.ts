export type Debts = {
  ingoingDebts: { userId: string; amount: number }[]
  outgoingDebts: { userId: string; amount: number }[]
}

export type Command =
  | { type: 'receipts' }
  | { type: 'payments' }
  | { type: 'groups' }
  | { type: 'cards' }
  | { type: 'receipt', params: { receiptId: string } }
  | { type: 'payment', params: { paymentId: string }, search?: { to_user_id?: string, amount?: number } }
  | { type: 'titles', params: { groupId: string } }
  | { type: 'card', params: { cardId: string } }
  | { type: 'roll-calls', params: { groupId: string } }
  | { type: 'roll-call', params: { groupId: string, rollCallId: string } }

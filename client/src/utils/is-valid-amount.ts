const MAX_AMOUNT = 100_000_00

export const isValidAmount = (amount: unknown): amount is number => {
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0 && amount <= MAX_AMOUNT
}
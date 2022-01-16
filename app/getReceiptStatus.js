export function getReceiptStatus(receipt) {
  const paid = receipt.debts.reduce((acc, curr) => acc + curr.paid, 0)

  return {
    paid,
    status: paid === receipt.amount
      ? 'paid'
      : paid === 0
        ? 'unpaid'
        : 'partiallyPaid'
  }
}

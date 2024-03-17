export function formatAmount(input: number) {
  if (!Number.isSafeInteger(input)) {
    throw new Error('Input must be integer')
  }

  const fixed = (input / 100).toFixed(2)
  return fixed.endsWith('.00') ? (input / 100).toFixed(0) : fixed
}

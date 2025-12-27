export type Currency = 'UAH'

export function formatAmount(input: number, currency?: Currency) {
  if (!Number.isSafeInteger(input)) {
    throw new Error('Input must be integer')
  }

  const sign = input < 0 ? '-' : ''
  input = Math.abs(input)

  const fixed = (input / 100).toFixed(2)
  const formatted = fixed.endsWith('.00') ? (input / 100).toFixed(0) : fixed

  if (currency === 'UAH') {
    return `${sign}₴${formatted}`
  }

  return `${sign}${formatted}`
}

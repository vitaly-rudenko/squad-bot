export function sanitizeMagicAmount(input: string): string {
  return input
    .replaceAll(',', '.')
    .replaceAll(/[^0-9+\-*/(). ]/g, '')
}

export function isMagicalAmount(input: string | undefined) {
  if (!input) return false

  const number = Number(input)
  if (!Number.isFinite(number)) return true

  return amountToCoins(number) !== parseMagicalAmount(input, 0)
}

export function parseMagicalAmount<T>(input: string | undefined, fallback: T): number | T {
  if (!input) return fallback

  try {
    const result: unknown = eval(input.replace(/[+\-*/(]+$/, ''))

    if (typeof result !== 'number') return fallback
    if (!Number.isFinite(result) || result < 0 || result > Number.MAX_SAFE_INTEGER) return fallback

    return amountToCoins(result)
  } catch {
    return fallback
  }
}

function amountToCoins(number: number): number {
  return Number((number * 100).toFixed(0))
}

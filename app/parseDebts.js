const DEBT_REGEX = /(?<name>.+):\s+((?<paid>[\d\.]+)\s+\/\s+(?<amount>[\d\.]+)|\?)/

export function parseDebts(source) {
  return source
    .split('\n')
    .map((rawDebt) => {
      const match = rawDebt.match(DEBT_REGEX)
      if (!match) {
        throw new Error(`Could not parse a debt record: ${rawDebt}`)
      }

      if (match.groups.amount === undefined) {
        return {
          name: match.groups.name,
          amount: null,
          paid: 0,
        }
      }

      return {
        name: match.groups.name,
        amount: Number(match.groups.amount),
        paid: Number(match.groups.paid),
      }
    })
}

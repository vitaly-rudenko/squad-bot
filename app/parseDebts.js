const DEBT_REGEX = /(?<name>.+):\s*(((?<paid>[\d\.]+)|\?)\s*\/\s*)?((?<amount>[\d\.]+)|\?)(\s*(?<comment>.+))?/

export function parseDebts(source) {
  return source
    .split('\n')
    .map(i => i.trim())
    .map((debt) => {
      const match = debt.match(DEBT_REGEX)
      if (!match) {
        throw new Error(`Could not parse a debt record: ${debt}`)
      }

      const amount = match.groups.amount !== undefined
        ? Number(match.groups.amount)
        : null

      const paid = match.groups.paid !== undefined
        ? Number(match.groups.paid)
        : 0

      const name = match.groups.name.startsWith('*')
        ? match.groups.name.slice(1).trim()
        : match.groups.name.trim()


      const comment = match.groups.comment !== undefined
        ? match.groups.comment.trim()
        : null

      return {
        type: debt.startsWith('*') ? 'external' : 'member',
        comment,
        name,
        amount,
        paid,
      }
    })
}
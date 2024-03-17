const LETTER_REGEX = /[a-z]/i

export function splitCalculations(input: string) {
  return input
    .replaceAll(/\s+/g, (match, i) => {
      const next = input[i + match.length]
      return next !== undefined && LETTER_REGEX.test(next) ? ' ' : ''
    })
    .split('+')
    .map((part, i) => i === 0 ? part : ` + ${part}`)
    .flatMap(sub => sub.split('=').map((part, i) => i === 0 ? part : ` = ${part}`))
    .flatMap(sub => sub.split('-').map((part, i) => i === 0 ? part : ` - ${part}`))
}

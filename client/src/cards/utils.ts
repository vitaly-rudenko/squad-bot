export function formatCardNumber(input: string) {
  input = input.replaceAll(/\D+/g, '')
  return Array.from(
    new Array(Math.ceil(input.length / 4)),
    (_, i) => input.slice(i * 4, i * 4 + 4)
  ).join(' ')
}

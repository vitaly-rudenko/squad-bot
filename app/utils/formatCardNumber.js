export function formatCardNumber(number) {
  return number.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()
}

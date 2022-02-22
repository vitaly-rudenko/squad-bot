export function toNullableAmount(amount) {
  return amount === null ? null : Number(amount)
}

export function isTruthy<T>(value: T | 0 | '' | false | null | undefined): value is T {
  return Boolean(value)
}

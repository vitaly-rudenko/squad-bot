export const unique = <T extends string>(array: T[]): T[] => {
  return [...new Set(array)]
}

export const Phases = organizeValues({})

/**
 * @param {T} values
 * @param {string[]} parents
 * @returns {T}
 * @template {{ [attribute: string]: string | T }} T
 */
export function organizeValues(values, parents = []) {
  // @ts-ignore
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      return [
        key,
        typeof value !== 'object'
          ? [...parents, key].join(':')
          : organizeValues(value, [...parents, key]),
      ]
    })
  )
}

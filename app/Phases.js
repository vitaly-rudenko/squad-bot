export const Phases = organizeValues({})

/**
* @param {T} values
* @returns {T}
* @template T
*/
export function organizeValues(values, parents = []) {
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

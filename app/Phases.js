export const Phases = organizeValues({
  addCard: {
    number: '',
  },
  deleteCard: {
    id: '',
  },
  rollCalls: '',
  deleteRollCall: {
    id: ''
  }
})

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

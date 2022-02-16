export const Phases = organizeValues({
  addCard: {
    bank: '',
    number: '',
  },
  deleteCard: {
    id: '',
  },
  getCard: {
    userId: '',
    id: '',
  }
})

/**
* @param {T} values
* @returns {T}
* @template T
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

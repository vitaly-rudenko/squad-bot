import { splitArrayIntoGroups } from '../utils'

describe('utils', () => {
  describe('splitArrayIntoGroups()', () => {
    it('should split array into equal groups', () => {
      const result = splitArrayIntoGroups([1, 2, 3, 4, 5, 6], { min: 2, max: 3 })
      expect(result).toEqual([[1, 2, 3], [4, 5, 6]])
    })

    it('should avoid small last group', () => {
      const result = splitArrayIntoGroups([1, 2, 3, 4, 5, 6, 7], { min: 2, max: 4 })
      expect(result).toEqual([[1, 2, 3, 4], [5, 6, 7]])
    })

    it('should handle empty array', () => {
      const result = splitArrayIntoGroups([], { min: 2, max: 4 })
      expect(result).toEqual([])
    })

    it('should handle small arrays', () => {
      const result = splitArrayIntoGroups([1], { min: 3, max: 5 })
      expect(result).toEqual([[1]])
    })

    it('should work with strings', () => {
      const result = splitArrayIntoGroups(['a', 'b', 'c', 'd', 'e'], { min: 2, max: 3 })
      expect(result).toEqual([['a', 'b', 'c'], ['d', 'e']])
    })

    it('should handle very small array with min: 2, max: 10', () => {
      const result = splitArrayIntoGroups([1], { min: 2, max: 10 })
      expect(result).toEqual([[1]])
    })

    it('should handle border case array with min: 2, max: 10', () => {
      const result = splitArrayIntoGroups([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], { min: 2, max: 10 })
      expect(result).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11]])
    })

    it('should handle large array with min: 2, max: 10', () => {
      const result = splitArrayIntoGroups(Array.from({ length: 50 }, (_, i) => i + 1), { min: 2, max: 10 })
      expect(result).toHaveLength(5)
      expect(result.every(group => group.length >= 2 && group.length <= 10)).toBe(true)
    })
  })
})

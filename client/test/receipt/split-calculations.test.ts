import { describe, it, expect } from 'vitest'
import { splitCalculations } from '../../src/receipts/split-calculations'

describe('splitCalculations()', () => {
  it('formats & splits the calculations', () => {
    expect(splitCalculations('10=10')).toEqual(['10', ' = 10'])
    expect(splitCalculations('10 + 20 - 30 = 0')).toEqual(['10', ' + 20', ' - 30', ' = 0'])
    expect(splitCalculations(' 10*  2+20 /2-(  30-10*2)/ 2 =25  ')).toEqual(['10*2', ' + 20/2', ' - (30', ' - 10*2)/2', ' = 25'])
    expect(splitCalculations('10+20 shared=30')).toEqual(['10', ' + 20 shared', ' = 30'])
    expect(splitCalculations('  10  +  20  shared  =  30  ')).toEqual(['10', ' + 20 shared', ' = 30'])
  })
})

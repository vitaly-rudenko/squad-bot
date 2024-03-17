import { formatAmount } from '@/utils/format-amount'
import { isTruthy } from '@/utils/is-truthy'
import type { FC } from 'react'
import { Ribbon } from './ribbon'
import { Badge } from '@/components/badge'

export const AmountSuggestions: FC<{
  variant: 'outline' | 'secondary'
  amount: string
  suggestions: number[]
  onChange: (amount: string) => unknown
}> = ({ variant, amount, suggestions, onChange }) => {
  return <Ribbon className='py-1'>
    {suggestions.map((suggestion, i) => {
      const amounts = amount.split(/\s*\+\s*/g).filter(amount => amount !== '')

      const formattedSuggestion1 = formatAmount(suggestion)
      const formattedSuggestion2 = `${formatAmount(suggestion)}*2`

      const includedIndex1 = amounts.lastIndexOf(formattedSuggestion1)
      const includedIndex2 = amounts.lastIndexOf(formattedSuggestion2)

      const isIncluded1 = includedIndex1 !== -1
      const isIncluded2 = includedIndex2 !== -1
      const isIncluded = isIncluded1 || isIncluded2

      return <div key={i} className='flex flex-row animation-down-top'>
        <Badge
          variant={isIncluded ? 'default' : variant}
          className='relative h-7 cursor-pointer justify-center'
          onClick={() => {
            onChange(
              isIncluded1
                ? amounts.with(includedIndex1, formattedSuggestion2).join('+')
                : isIncluded2
                  ? amounts.with(includedIndex2, '').filter(isTruthy).join('+')
                  : [...amounts, formattedSuggestion1].join('+')
            )
          }}>
            <span className='absolute'>{formattedSuggestion1}{isIncluded2 ? '×2' : ''}</span>

            {/* Invisible element to avoid Badge width jump when visible text changes. */}
            <span className='invisible'>{formattedSuggestion1}×2</span>
          </Badge>
      </div>
    })}
  </Ribbon>
}
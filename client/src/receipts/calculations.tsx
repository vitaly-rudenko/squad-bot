import { type FC, useMemo } from 'react'
import type { Debt, Amount, TipAmount, SharedExpenses } from './calculate-receipt'
import { formatCalculations } from './format-calculations'

export const Calculations: FC<{
  input:
    | { debt: Debt }
    | { amount: Amount }
    | { tipAmount: TipAmount }
    | { sharedExpenses: SharedExpenses }
}> = ({ input }) => {
  const calculations = useMemo(() => formatCalculations(input), [input])
  if (!calculations) return null

  return <div className='flex flex-row flex-wrap justify-end gap-1 text-xs animation-top-down'>
    {calculations.addends.map((addend, i) => (
      <div key={i} className='whitespace-nowrap text-primary/70'>{i > 0 ? '+ ' : ''}{addend}</div>
    ))}
    <div className='whitespace-nowrap font-medium'>{'= '}{calculations.result}</div>
  </div>
}

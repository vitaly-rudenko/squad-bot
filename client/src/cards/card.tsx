import { Card as CardType } from '@/cards/types'
import { Button } from '@/components/button'
import { Card as CardComponent, CardFooter, CardHeader } from '@/components/card'
import { Separator } from '@/components/separator'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/utils/cn'
import { FC, useCallback, useState } from 'react'
import { ArrowDownLeftFromSquare, Cat } from 'lucide-react'
import { createToast } from '@/utils/toast'
import { formatCardNumber } from './utils'

export const Card: FC<{
  card: CardType
  onDelete?: () => unknown
}> = ({ card, onDelete }) => {
  const [activated, setActivated] = useState(false)

  const handleCopy = useCallback(() => {
    if (!card) return
    if (!navigator?.clipboard?.writeText) {
      createToast('Could not copy the card number', { type: 'error' })
      return
    }

    try {
      navigator.clipboard.writeText(card.number)
      createToast('Copied card number to the clipboard', { type: 'success' })
    } catch (error) {
      createToast('Could not copy card number', {
        ...error instanceof Error && { description: error.message },
        type: 'error'
      })
    }
  }, [card])

  const hasActionButtons = onDelete !== undefined

  return <CardComponent className={cn(
    'overflow-hidden transition hover:shadow-lg',
    activated ? 'shadow-lg' : 'shadow-md',
  )}>
    <CardHeader onClick={() => {
      if (hasActionButtons) {
        setActivated(!activated)
      } else {
        handleCopy()
      }
    }} className={cn(
      'grow bg-gradient-to-l to-30%',
      !activated && 'cursor-pointer',
      card.bank === 'privatbank' ? 'from-emerald-50 dark:from-emerald-950' : 'from-zinc-200 dark:from-zinc-800',
    )}>
      <div className='flex flex-row justify-between items-baseline gap-3'>
        <span className='grow truncate'>{formatCardNumber(card.number)}</span>
        <span className={cn(
          'flex flex-row gap-1 items-baseline',
          card.bank === 'privatbank' ? 'text-emerald-600 dark:text-emerald-300' : 'text-zinc-800 dark:text-zinc-300'
        )}>
          <span>{card.bank === 'privatbank' ? 'PRIVATBANK' : 'MONOBANK'}</span>
          {card.bank === 'privatbank'
            ? <ArrowDownLeftFromSquare className='w-4 h-4 self-center' />
            : <Cat className='w-4 h-4 self-center' />}
        </span>
      </div>
    </CardHeader>

    {/* Action buttons */}
    {!!hasActionButtons && (
      <div className={cn(
        'transition-[height]',
        activated ? 'h-10' : 'h-0'
      )}>
        <Separator />
        <CardFooter className='flex flex-row items-stretch p-0 h-full'>
          <Button className='grow basis-1' variant='link' onClick={handleCopy}>
            Copy
          </Button>
          {!!onDelete && <>
            <Separator orientation='vertical' />
            <Button className='grow basis-1 text-destructive' variant='link' onClick={onDelete}>
              Delete
            </Button>
          </>}
        </CardFooter>
      </div>
    )}
  </CardComponent>
}

export const CardSkeleton: FC = () => {
  return <Skeleton className='h-[3.5rem]' />
}

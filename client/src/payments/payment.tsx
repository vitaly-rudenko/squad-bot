import { useRequiredAuth } from '@/auth/hooks'
import { Payment as PaymentType } from '@/payments/types'
import type { User } from '@/users/types'
import { Button } from '@/components/button'
import { Card, CardFooter, CardHeader } from '@/components/card'
import { Separator } from '@/components/separator'
import { Skeleton } from '@/components/skeleton'
import { UserName } from '@/users/user-name'
import { cn } from '@/utils/cn'
import { formatAmount } from '@/utils/format-amount'
import { formatDateTime } from '@/utils/format-date-time'
import { ArrowLeftToLine, ArrowRightFromLine } from 'lucide-react'
import { FC, useState } from 'react'

export const Payment: FC<{
  users: User[]
  payment: PaymentType
  onEdit: () => unknown
  onDelete: () => unknown
}> = ({ users, payment, onEdit, onDelete }) => {
  const { currentUser } = useRequiredAuth()
  const [activated, setActivated] = useState(false)

  const receive = payment.toUserId === currentUser.id
  const participantId = receive ? payment.fromUserId : payment.toUserId
  const participant = users.find(u => u.id === participantId)

  return <Card className={cn(
    'overflow-hidden transition hover:shadow-lg',
    activated ? 'shadow-lg' : 'shadow-md',
  )}>
    <div className={cn(!activated && 'cursor-pointer')} onClick={() => setActivated(!activated)}>
      <CardHeader className={cn(
        'bg-gradient-to-r to-30%',
        receive ? 'from-emerald-50 dark:from-emerald-950' : 'from-rose-50 dark:from-rose-950'
      )}>
        <div className='flex flex-row justify-between items-baseline'>
          <div className='flex flex-row items-baseline gap-3 overflow-hidden'>
            <span className={cn(
              'flex flex-row items-baseline gap-2',
              receive ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'
            )}>
              <span className='self-center shrink-0'>
                {receive
                  ? <ArrowLeftToLine className='w-4 h-4' />
                  : <ArrowRightFromLine className='w-4 h-4' />}
              </span>
              <span className='min-w-16'>₴{formatAmount(payment.amount)}</span>
            </span>
            <span className='overflow-hidden'><UserName user={participant} /></span>
          </div>
          <div className={cn('whitespace-nowrap text-primary/70', activated && 'animation-right-left')}>
            {formatDateTime(payment.createdAt, { expand: activated })}
          </div>
        </div>
      </CardHeader>
    </div>

    {/* Action buttons */}
    <div className={cn(
      'transition-[height]',
      activated ? 'h-10' : 'h-0'
    )}>
      <Separator />
      <CardFooter className='flex flex-row items-stretch p-0 h-full'>
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' disabled onClick={onEdit}>
          Edit
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2 text-destructive' variant='link' onClick={onDelete}>
          Delete
        </Button>
      </CardFooter>
    </div>
  </Card>
}

export const PaymentSkeleton: FC = () => {
  return <Skeleton className='h-[3.5rem] animation-appear' />
}

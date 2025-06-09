import { useRouter } from '@tanstack/react-router'
import { ArrowLeftToLine, ArrowRightFromLine } from 'lucide-react'
import { FC, useEffect } from 'react'
import { cn } from '@/utils/cn'
import { useUsersQuery } from '@/users/api'
import { Badge } from '@/components/badge'
import { formatAmount } from '@/utils/format-amount'
import { Skeleton } from '@/components/skeleton'
import { Ribbon } from '@/receipts/ribbon'
import { useDebtsQuery } from './api'

export const DebtsWidget: FC<{ refreshKey?: unknown }> = (props) => {
  const router = useRouter()
  const { data: debts, refetch } = useDebtsQuery()

  const flattenedDebts = debts
    ? [
      ...debts.ingoingDebts.map(debt => ({ userId: debt.userId, amount: debt.amount, type: 'ingoing' })),
      ...debts.outgoingDebts.map(debt => ({ userId: debt.userId, amount: debt.amount, type: 'outgoing' })),
    ].toSorted((a, b) => b.amount - a.amount)
    : undefined

  const { data: users } = useUsersQuery(
    { userIds: flattenedDebts ? flattenedDebts.map(debt => debt.userId) : [] },
    { enabled: flattenedDebts !== undefined }
  )

  useEffect(() => { refetch() }, [refetch, props.refreshKey])

  if (!flattenedDebts || !users) {
    return <Skeleton className='h-[10.5rem] animation-appear' />
  }

  if (flattenedDebts.length === 0) {
    return null
  }

  return <Ribbon className='py-1'>
    {flattenedDebts.map(debt => <>
      <Badge
        className={cn(
          'relative h-7 cursor-pointer justify-center',
          debt.type === 'ingoing'
            ? 'bg-emerald-600 dark:bg-emerald-400'
            : 'bg-rose-600 dark:bg-rose-400'
        )}
        onClick={() => {
          router.navigate({
            to: '/payments/$paymentId',
            params: { paymentId: 'new' },
            search: {
              ...debt.type === 'ingoing'
                ? { from_user_id: debt.userId }
                : { to_user_id: debt.userId },
              amount: debt.amount,
            },
          })
        }
      }>
        <div className='text-nowrap flex flex-row gap-1'>
          <span>
            {debt.type === 'ingoing'
              ? <ArrowLeftToLine className='w-4 h-4' />
              : <ArrowRightFromLine className='w-4 h-4' />}
          </span>
          <span>
            ₴{formatAmount(debt.amount)} {debt.type === 'ingoing' ? 'from' : 'to'} {users.find(u => u.id === debt.userId)?.name}
          </span>
        </div>
      </Badge>
    </>)}
  </Ribbon>
}

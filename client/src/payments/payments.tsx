import { Payment, PaymentSkeleton } from '@/payments/payment'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/button'
import { Plus, RefreshCcw } from 'lucide-react'
import { useDeletePaymentMutation, usePaymentsQuery } from '@/payments/api'
import { FC, useEffect, useState } from 'react'
import { Pagination } from '@/navigation/pagination'
import { Alert } from '@/components/alert-dialog'
import { cn } from '@/utils/cn'
import { createToast } from '@/utils/toast'
import { useUsersQuery } from '@/users/api'
import { DebtsWidget } from '@/debts/debts-widget'
import { useTranslation } from 'react-i18next'

const perPage = 15

export const Payments: FC = () => {
  const { t } = useTranslation('payments')

  const [page, setPage] = useState(1)
  const { data: payments, refetch, isRefetching, isSuccess } = usePaymentsQuery({ page, perPage })
  const totalPages = Math.max(1, payments ? Math.ceil(payments.total / perPage) : 1)

  const { data: users } = useUsersQuery(
    { userIds: payments ? payments.items.flatMap(p => [p.fromUserId, p.toUserId]) : [] },
    { enabled: payments !== undefined }
  )

  const [deleteId, setDeleteId] = useState<string>()
  const deleteMutation = useDeletePaymentMutation()

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      createToast(t('Payment has been deleted'), { type: 'success' })
      setDeleteId(undefined)
      refetch()
    }
  }, [deleteMutation.isSuccess, refetch, t])

  return <>
    <Alert
      title={t('Delete payment?')}
      confirm={t('Yes, delete it')}
      disabled={deleteMutation.isPending}
      open={deleteId !== undefined}
      onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      onCancel={() => setDeleteId(undefined)}
    />

    <div className='animation-down-top flex flex-col gap-3'>
      <div className='flex flex-row justify-between items-baseline'>
        <div className='flex flex-row gap-2 items-baseline text-xl font-medium cursor-pointer' onClick={() => refetch()}>
          <span>{t('Payments')}</span>
          <RefreshCcw className='w-4 h-4 self-center shrink-0' />
        </div>
        <Link to='/payments/$paymentId' params={{ paymentId: 'new' }} className='group'>
          <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline'>
            <Plus className='w-4 h-4 self-center shrink-0' /><span>{t('Record a payment')}</span>
          </Button>
        </Link>
      </div>

      <DebtsWidget refreshKey={payments?.total} />

      <Pagination page={page} totalPages={totalPages} setPage={setPage} hideByDefault />

      <div className={cn(
        'flex flex-col gap-2 transition',
        isRefetching && 'grayscale opacity-70 pointer-events-none'
      )}>
        {users !== undefined && isSuccess ? <>
          {payments.total === 0 && <p>{t('Whoops, nothing to see here!')}</p>}
          {payments.items.map(payment => (
            <Payment key={payment.id} users={users} payment={payment} onEdit={() => {}} onDelete={() => setDeleteId(payment.id)} />
          ))}
        </> : <>
          <PaymentSkeleton />
          <PaymentSkeleton />
          <PaymentSkeleton />
        </>}
      </div>

      {!!users && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
    </div>
  </>
}
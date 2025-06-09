import { Button } from '@/components/button'
import { Link, useRouter } from '@tanstack/react-router'
import { Plus, RefreshCcw } from 'lucide-react'
import { Receipt, ReceiptSkeleton } from '@/receipts/receipt'
import { useDeleteReceiptMutation, useReceiptsQuery } from '@/receipts/api'
import { FC, useEffect, useState } from 'react'
import { Pagination } from '@/navigation/pagination'
import { ReceiptPhotoViewer } from '@/receipts/receipt-photo-viewer'
import { Alert } from '@/components/alert-dialog'
import { cn } from '@/utils/cn'
import { createToast } from '@/utils/toast'
import { useUsersQuery } from '@/users/api'
import { DebtsWidget } from '@/debts/debts-widget'
import { useTranslation } from 'react-i18next'

const perPage = 15

export const Receipts: FC = () => {
  const { t } = useTranslation('receipts')
  const router = useRouter()

  const [page, setPage] = useState(1)
  const { data: receipts, refetch, isRefetching, isSuccess } = useReceiptsQuery({ page, perPage })
  const totalPages = Math.max(1, receipts ? Math.ceil(receipts.total / perPage) : 1)

  const { data: users } = useUsersQuery(
    { userIds: receipts ? receipts.items.flatMap(r => [r.payerId, ...r.debts.map(d => d.debtorId)]) : [] },
    { enabled: receipts !== undefined }
  )

  const deleteMutation = useDeleteReceiptMutation()
  const [deleteId, setDeleteId] = useState<string>()

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [photoSrc, setPhotoSrc] = useState<string>()

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      createToast('Receipt has been deleted', { type: 'success' })
      setDeleteId(undefined)
      refetch()
    }
  }, [deleteMutation.isSuccess, refetch])

  return <>
    <ReceiptPhotoViewer
      open={photoViewerOpen}
      photoSrc={photoSrc}
      onClose={() => setPhotoViewerOpen(false)}
    />

    <Alert
      title='Delete receipt?'
      confirm='Yes, delete it'
      disabled={deleteMutation.isPending}
      open={deleteId !== undefined}
      onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      onCancel={() => setDeleteId(undefined)}
    />

    <div className='animation-down-top flex flex-col gap-3'>
      <div className='flex flex-row justify-between items-baseline'>
        <div className='flex flex-row gap-2 items-baseline text-xl font-medium cursor-pointer' onClick={() => refetch()}>
          <span>{t('Receipts')}</span>
          <RefreshCcw className='w-4 h-4 self-center shrink-0' />
        </div>
        <Link to='/receipts/$receiptId' params={{ receiptId: 'new' }} className='group'>
          <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline'>
            <Plus className='w-4 h-4 self-center shrink-0' />
            <span>{t('Record a receipt')}</span>
          </Button>
        </Link>
      </div>

      <DebtsWidget refreshKey={receipts?.total} />

      <Pagination page={page} totalPages={totalPages} setPage={setPage} hideByDefault />

      <div className={cn(
        'flex flex-col gap-2 transition',
        isRefetching && 'grayscale opacity-70 pointer-events-none'
      )}>
        {users && isSuccess ? <>
          {receipts.total === 0 && <p>Whoops, nothing to see here!</p>}
          {receipts.items.map(receipt => (
            <Receipt key={receipt.id} users={users} receipt={receipt}
              onEdit={() => router.navigate({ to: '/receipts/$receiptId', params: { receiptId: receipt.id } })}
              onDelete={() => setDeleteId(receipt.id)}
              onPhotoView={(photoUrl) => {
                setPhotoSrc(photoUrl)
                setPhotoViewerOpen(true)
              }} />
          ))}
        </> : <>
          <ReceiptSkeleton />
          <ReceiptSkeleton />
          <ReceiptSkeleton />
        </>}
      </div>

      {!!users && <Pagination page={page} totalPages={totalPages} setPage={setPage} />}
    </div>
  </>
}

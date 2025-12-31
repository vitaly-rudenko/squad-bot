import { FC, useState } from 'react'
import { Button } from '@/components/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/card'
import { Separator } from '@/components/separator'
import { Coins, Image } from 'lucide-react'
import { UserName } from '@/users/user-name'
import { cn } from '@/utils/cn'
import { Receipt as ReceiptType } from '@/receipts/types'
import { formatAmount } from '@/utils/format-amount'
import { formatDateTime } from '@/utils/format-date-time'
import { Skeleton } from '@/components/skeleton'
import { getReceiptPhotoUrl } from './get-receipt-photo-url'
import type { User } from '@/users/types'
import { parseDescription } from './utils'
import { useTranslation } from 'react-i18next'
import { useI18n } from '@/i18n/hooks'

export const Receipt: FC<{
  users: User[]
  receipt: ReceiptType
  onEdit: () => unknown
  onDelete: () => unknown
  onPhotoView: (photoUrl: string) => unknown
}> = ({ users, receipt, onEdit, onDelete, onPhotoView }) => {
  const { t } = useTranslation('receipts')
  const { language } = useI18n()

  const [activated, setActivated] = useState(false)

  const payer = users.find(u => u.id === receipt.payerId)
  const debts = receipt.debts.map(debt => ({
    debtor: users.find(u => u.id === debt.debtorId),
    amount: debt.amount,
  }))

  const { isTip, description } = parseDescription(receipt.description)

  return <Card className={cn(
    'overflow-hidden transition hover:shadow-lg',
    activated ? 'shadow-lg' : 'shadow-md',
  )}>
    <div className={cn(!activated && 'cursor-pointer')} onClick={() => setActivated(!activated)}>
      {/* Header */}
      <CardHeader>
        <div className='flex flex-row justify-between items-baseline'>
          <div className='overflow-hidden flex flex-row gap-1.5 items-baseline'>
            {!!isTip && <Coins className='self-center shrink-0 w-4 h-4' />}
            {receipt.photoFilename !== undefined && <Image className='self-center shrink-0 w-4 h-4' />}
            <span className={cn(description ? 'font-medium' : 'text-primary/70', 'truncate')}>{description || t('(no description)')}</span>
          </div>
          <div className={cn('whitespace-nowrap text-primary/70', activated && 'animation-right-left')}>
            {formatDateTime(receipt.createdAt, { expand: activated, language })}
          </div>
        </div>
        <div className='flex flex-row justify-between items-baseline gap-3'>
          <div className='flex flex-row gap-1 items-baseline overflow-hidden whitespace-nowrap'>
            <span>{t('Paid by')}</span>
            <span className='overflow-hidden font-medium'><UserName user={payer} /></span>
          </div>
          <div className='whitespace-nowrap font-medium'>{formatAmount(receipt.amount, 'UAH')}</div>
        </div>
      </CardHeader>

      {/* Debts */}
      <CardContent className='py-3 bg-secondary'>
        <div className='flex flex-col gap-1'>
          {debts.map(({ debtor, amount }) => (
            <div key={debtor?.id} className='flex flex-row gap-2 items-baseline'>
              <div className='overflow-hidden'><UserName user={debtor} /></div>
              <div className='border-b border-input border-dashed grow min-w-5'></div>
              <div className='whitespace-nowrap'>{formatAmount(amount || 0)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </div>

    {/* Action buttons */}
    <div className={cn('transition-[height]', activated ? 'h-10' : 'h-0')}>
      <Separator />
      <CardFooter className='flex flex-row items-stretch p-0 h-full'>
        <Button className='grow basis-1 flex flex-row gap-2' variant='link'
          disabled={receipt.photoFilename === undefined}
          onClick={() => {
            if (!receipt.photoFilename) return
            onPhotoView(getReceiptPhotoUrl(receipt.photoFilename))
          }}>
          {t('Photo')}
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={onEdit}>
          {t('Edit')}
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2 text-destructive' variant='link' onClick={onDelete}>
          {t('Delete')}
        </Button>
      </CardFooter>
    </div>
  </Card>
}

export const ReceiptSkeleton: FC = () => {
  return <Skeleton className='h-[10.5rem] animation-appear' />
}

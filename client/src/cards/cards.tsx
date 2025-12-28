import { Button } from '@/components/button'
import { Pagination } from '@/navigation/pagination'
import { cn } from '@/utils/cn'
import { Link } from '@tanstack/react-router'
import { RefreshCcw, Plus } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { useCardsQuery, useDeleteCardMutation } from './api'
import { Card, CardSkeleton } from './card'
import { createToast } from '@/utils/toast'
import { Alert } from '@/components/alert-dialog'
import { useRequiredAuth } from '@/auth/hooks'
import { UserCombobox } from '@/users/user-combobox'
import { useTranslation } from 'react-i18next'

const perPage = 15

export const Cards: FC = () => {
  const { t } = useTranslation('cards')
  const { currentUser } = useRequiredAuth()

  const [user, setUser] = useState(currentUser)

  const [page, setPage] = useState(1)
  const { data: cards, refetch, isRefetching, isSuccess } = useCardsQuery({ userId: user.id, page, perPage })
  const totalPages = Math.max(1, cards ? Math.ceil(cards.total / perPage) : 1)

  const [deleteId, setDeleteId] = useState<string>()
  const deleteMutation = useDeleteCardMutation()

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      createToast(t('Card has been deleted'), { type: 'success' })
      setDeleteId(undefined)
      refetch()
    }
  }, [deleteMutation.isSuccess, refetch, t])

  const isCurrentUser = user.id === currentUser.id

  return <>
    <Alert
      title={t('Delete card?')}
      confirm={t('Yes, delete it')}
      disabled={deleteMutation.isPending}
      open={deleteId !== undefined}
      onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      onCancel={() => setDeleteId(undefined)}
    />

    <div className='animation-down-top flex flex-col gap-3'>
      <div className='flex flex-row justify-between items-baseline gap-3'>
        <div className='flex flex-row gap-2 items-baseline text-xl font-medium cursor-pointer overflow-hidden' onClick={() => refetch()}>
          <span className='truncate'>{t('Cards')}</span>
          <RefreshCcw className='w-4 h-4 self-center shrink-0' />
        </div>
        {!!isCurrentUser && (
          <Link to='/cards/$cardId' params={{ cardId: 'new' }} className='group animation-appear'>
            <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline'>
              <Plus className='w-4 h-4 self-center shrink-0' /><span>{t('Add a card')}</span>
            </Button>
          </Link>
        )}
      </div>

      <UserCombobox
        selectedUser={user}
        onSelect={(user) => user && setUser(user)}
        placeholder={t('Select user')}
      />

      <Pagination page={page} totalPages={totalPages} setPage={setPage} hideByDefault />

      <div className={cn(
        'flex flex-col gap-2 transition',
        isRefetching && 'grayscale opacity-70 pointer-events-none'
      )}>
        {isSuccess ? <>
          {cards.total === 0 && (
            isCurrentUser
              ? <div className='flex flex-col gap-3'>
                  <span>{t('You haven\'t added any cards yet.')}</span>
                  <Link to='/cards/$cardId' params={{ cardId: 'new' }}>
                    <Button>{t('Add a card')}</Button>
                  </Link>
                </div>
              : <div>{t('{{name}} hasn\'t added any cards yet.', { name: user.name })}</div>
          )}
          {cards.items.map((card) => (
            <Card key={card.id}
              card={card}
              onDelete={isCurrentUser ? () => setDeleteId(String(card.id)) : undefined}
            />
          ))}
        </> : <CardSkeleton />}
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  </>
}

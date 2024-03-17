import { Button } from '@/components/button'
import { Pagination } from '@/navigation/pagination'
import { cn } from '@/utils/cn'
import { Link, useRouter } from '@tanstack/react-router'
import { RefreshCcw, Plus } from 'lucide-react'
import { FC, useCallback, useEffect, useState } from 'react'
import { useDeleteRollCallMutation, useRollCallsQuery, useSwapRollCallsMutation } from './api'
import { useGroupQuery } from '@/groups/api'
import { RollCall, RollCallSkeleton } from './roll-call'
import { createToast, dismissToast } from '@/utils/toast'
import { Skeleton } from '@/components/skeleton'
import { Alert } from '@/components/alert-dialog'

const perPage = 15

export const RollCalls: FC<{
  groupId: string
}> = ({ groupId }) => {
  const router = useRouter()
  const { data: group } = useGroupQuery(groupId)

  const deleteMutation = useDeleteRollCallMutation()
  const [deleteId, setDeleteId] = useState<string>()

  const [page, setPage] = useState(1)
  const { data: rollCalls, refetch, isRefetching, isSuccess } = useRollCallsQuery({ groupId, page, perPage })
  const totalPages = Math.max(1, rollCalls ? Math.ceil(rollCalls.total / perPage) : 1)

  const swapMutation = useSwapRollCallsMutation()

  const handleMove = useCallback(async (i: number, direction: 1 | -1) => {
    if (!rollCalls) return
    const rollCall1 = rollCalls.items.at(i)
    const rollCall2 = rollCalls.items.at(i + direction)
    if (!rollCall1 || !rollCall2) return

    const toastId = createToast('Moving the roll call...', { type: 'loading' })

    await swapMutation.mutateAsync({ rollCall1, rollCall2 })

    dismissToast(toastId)
    refetch()
  }, [refetch, rollCalls, swapMutation])

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      createToast('Roll call has been deleted', { type: 'success' })
      setDeleteId(undefined)
      refetch()
    }
  }, [deleteMutation.isSuccess, refetch])

  return <>
    <Alert
      title='Delete roll call?'
      confirm='Yes, delete it'
      disabled={deleteMutation.isPending}
      open={deleteId !== undefined}
      onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      onCancel={() => setDeleteId(undefined)}
    />

    <div className='animation-down-top flex flex-col gap-3'>
      <div className='flex flex-row justify-between items-baseline gap-3'>
        <div className='flex flex-row gap-2 items-baseline text-xl font-medium cursor-pointer overflow-hidden' onClick={() => refetch()}>
          <span className='truncate'>Roll calls</span>
          <RefreshCcw className='w-4 h-4 self-center shrink-0' />
        </div>
        <Link to='/groups/$groupId/roll-calls/$rollCallId' params={{ groupId, rollCallId: 'new' }} className='group'>
          <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline'>
            <Plus className='w-4 h-4 self-center shrink-0' /><span>Create a roll call</span>
          </Button>
        </Link>
      </div>

      {group
        ? <div className='text-sm font-medium text-primary'>{group.title}</div>
        : <Skeleton className='h-[1.25rem]' />}

      <Pagination page={page} totalPages={totalPages} setPage={setPage} hideByDefault />

      <div className={cn(
        'flex flex-col gap-2 transition',
        (isRefetching || swapMutation.isPending) && 'grayscale opacity-70 pointer-events-none'
      )}>
        {isSuccess ? <>
          {rollCalls.total === 0 && <p>Whoops, nothing to see here!</p>}
          {rollCalls.items.map((rollCall, i) => (
            <RollCall key={rollCall.id} groupId={groupId} rollCall={rollCall}
              onEdit={() => router.navigate({ to: '/groups/$groupId/roll-calls/$rollCallId', params: { groupId, rollCallId: String(rollCall.id) } })}
              onDelete={() => setDeleteId(String(rollCall.id))}
              onMoveUp={rollCalls.items.length > 1 && i > 0 ? () => handleMove(i, -1) : undefined}
              onMoveDown={rollCalls.items.length > 1 && i < rollCalls.items.length - 1 ? () => handleMove(i, 1) : undefined}
            />
          ))}
        </> : <RollCallSkeleton />}
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  </>
}

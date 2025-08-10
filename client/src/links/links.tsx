import { Button } from '@/components/button'
import { Pagination } from '@/navigation/pagination'
import { cn } from '@/utils/cn'
import { Link as RouterLink, useRouter } from '@tanstack/react-router'
import { RefreshCcw, Plus, ArrowLeft } from 'lucide-react'
import { FC, useEffect, useState } from 'react'
import { useDeleteLinkMutation, useLinksQuery } from './api'
import { useGroupQuery } from '@/groups/api'
import { Link, LinkSkeleton } from './link'
import { createToast } from '@/utils/toast'
import { Skeleton } from '@/components/skeleton'
import { Alert } from '@/components/alert-dialog'

const perPage = 15

export const Links: FC<{
  groupId: string
}> = ({ groupId }) => {
  const router = useRouter()
  const { data: group } = useGroupQuery(groupId)

  const deleteMutation = useDeleteLinkMutation()
  const [deleteId, setDeleteId] = useState<string>()

  const [page, setPage] = useState(1)
  const { data: links, refetch, isRefetching, isSuccess } = useLinksQuery({ groupId, page, perPage })
  const totalPages = Math.max(1, links ? Math.ceil(links.total / perPage) : 1)

  useEffect(() => {
    if (deleteMutation.isSuccess) {
      createToast('Link has been deleted', { type: 'success' })
      setDeleteId(undefined)
      refetch()
    }
  }, [deleteMutation.isSuccess, refetch])

  if (!group) {
    return <Skeleton className='h-[20rem]' />
  }

  return <>
    <Alert
      title='Delete link?'
      confirm='Yes, delete it'
      disabled={deleteMutation.isPending}
      open={deleteId !== undefined}
      onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      onCancel={() => setDeleteId(undefined)}
    />

    <div className='animation-down-top flex flex-col gap-3'>
      <div className='flex flex-row justify-between items-baseline gap-3'>
        <div className='flex flex-row gap-2 items-baseline text-xl font-medium cursor-pointer overflow-hidden' onClick={() => refetch()}>
          <span className='truncate'>Links</span>
          <RefreshCcw className='w-4 h-4 self-center shrink-0' />
        </div>
        <RouterLink to='/groups/$groupId/links/$linkId' params={{ groupId, linkId: 'new' }} className='group'>
          <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline'>
            <Plus className='w-4 h-4 self-center shrink-0' /><span>Add Link</span>
          </Button>
        </RouterLink>
      </div>

      <Button variant='link' className='p-0 h-auto flex flex-row gap-1 items-baseline justify-start'
        onClick={() => router.navigate({ to: '/groups' })}>
        <ArrowLeft className='w-4 h-4 self-center shrink-0' />
        <span className='truncate'>{group.title}</span>
      </Button>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} hideByDefault />

      <div className={cn(
        'flex flex-col gap-2 transition',
        isRefetching && 'grayscale opacity-70 pointer-events-none'
      )}>
        {isSuccess ? <>
          {links.total === 0 && <p>Whoops, nothing to see here!</p>}
          {links.items.map((link) => (
            <Link key={link.id} link={link}
              onEdit={() => router.navigate({ to: '/groups/$groupId/links/$linkId', params: { groupId, linkId: String(link.id) } })}
              onDelete={() => setDeleteId(String(link.id))}
            />
          ))}
        </> : <LinkSkeleton />}
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  </>
}

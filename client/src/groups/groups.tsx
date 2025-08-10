import { FC, useState } from 'react'
import { useGroupsQuery } from './api'
import { cn } from '@/utils/cn'
import { RefreshCcw } from 'lucide-react'
import { Pagination } from '@/navigation/pagination'
import { Group, GroupSkeleton } from './group'
import { useRouter } from '@tanstack/react-router'
import { Card } from '@/components/card'

const perPage = 15

export const Groups: FC = () => {
  const router = useRouter()

  const [page, setPage] = useState(1)
  const { data: groups, refetch, isRefetching, isSuccess } = useGroupsQuery({ page, perPage })
  const totalPages = Math.max(1, groups ? Math.ceil(groups.total / perPage) : 1)

  return <>
    <div className='animation-down-top flex flex-col gap-3'>
      <div className='flex flex-row justify-between items-baseline'>
        <div className='flex flex-row gap-2 items-baseline text-xl font-medium cursor-pointer' onClick={() => refetch()}>
          <span>Groups</span>
          <RefreshCcw className='w-4 h-4 self-center' />
        </div>
      </div>

      <Card className={cn('px-3 py-1 bg-secondary border-none italic shadow-none text-primary/90')}>
        <a className='underline' href='https://t.me/groupsquadbot'>@groupsquadbot</a> only sees users that have sent at least one message to the group.
      </Card>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} hideByDefault />

      <div className={cn(
        'flex flex-col gap-2 transition',
        isRefetching && 'grayscale opacity-70 pointer-events-none'
      )}>
        {isSuccess ? <>
          {groups.total === 0 && <p>
            Whoops, nothing to see here!<br/>
            <span className='text-primary/70'>Consider adding <a className='underline' href='https://t.me/groupsquadbot'>@groupsquadbot</a> to your group chat!</span>
          </p>}
          {groups.items.map(group => (
            <Group
              key={group.id}
              group={group}
              onRollCalls={() => router.navigate({ to: '/groups/$groupId/roll-calls', params: { groupId: group.id } })}
              onTitles={() => router.navigate({ to: '/groups/$groupId/titles', params: { groupId: group.id } })}
              onLinks={() => router.navigate({ to: '/groups/$groupId/links', params: { groupId: group.id } })}
            />
          ))}
        </> : <GroupSkeleton />}
      </div>

      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  </>
}

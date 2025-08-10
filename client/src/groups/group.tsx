import { FC, useState } from 'react'
import { Group as GroupType } from './types'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { useUsersQuery } from '@/users/api'
import { UserName } from '@/users/user-name'
import { cn } from '@/utils/cn'
import { Button } from '@/components/button'
import { Separator } from '@/components/separator'

export const Group: FC<{
  group: GroupType
  onRollCalls: () => unknown
  onTitles: () => unknown
  onLinks: () => unknown
}> = ({ group, onRollCalls, onTitles, onLinks }) => {
  const { data: users } = useUsersQuery({ groupId: group.id })
  const [activated, setActivated] = useState(false)

  if (!users) {
    return <Skeleton className='h-[9rem] animation-appear' />
  }

  return <Card className={cn(
    'overflow-hidden transition hover:shadow-lg',
    activated ? 'shadow-lg' : 'shadow-md',
  )}>
    <div className={cn('flex flex-col grow', !activated && 'cursor-pointer')} onClick={() => setActivated(!activated)}>
      {/* Header */}
      <CardHeader>
        <div className='flex flex-row justify-between items-baseline'>
          <div className='overflow-hidden flex flex-row gap-1.5 items-baseline'>
            <span className='font-medium truncate'>{group.title}</span>
          </div>
        </div>
      </CardHeader>

      {/* Users */}
      <CardContent className='py-3 bg-secondary'>
        <div className='grid grid-cols-2 gap-1'>
          {users.map((user, i) => (
            <UserName
              key={user.id}
              className={cn(users.length % 2 !== 0 && i === users.length - 1 && 'col-span-full')}
              user={user}
            />
          ))}
        </div>
      </CardContent>
    </div>

    {/* Action buttons */}
    <div className={cn(
      'transition-[height]',
      activated ? 'h-10' : 'h-0'
    )}>
      <Separator />
      <CardFooter className='flex flex-row items-stretch p-0 h-full'>
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={onRollCalls}>
          Roll calls
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={onTitles}>
          Titles
        </Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={onLinks}>
          Links
        </Button>
      </CardFooter>
    </div>
  </Card>
}

export const GroupSkeleton: FC = () => {
  return <Skeleton className='h-[9rem] animation-appear' />
}

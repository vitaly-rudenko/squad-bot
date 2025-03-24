import { FC, Fragment, useState } from 'react'
import { RollCall as RollCallType } from './types'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { useUsersQuery } from '@/users/api'
import { UserName } from '@/users/user-name'
import { cn } from '@/utils/cn'
import { Separator } from '@/components/separator'
import { Button } from '@/components/button'
import { ArrowDown, ArrowUp, CheckCheck, EyeOff, LayoutList, ListChecks, UserMinus } from 'lucide-react'
import { parseMessagePattern } from './utils'

export const RollCall: FC<{
  groupId: string
  rollCall: RollCallType
  onEdit: () => unknown
  onDelete: () => unknown
  onMoveUp?: () => unknown
  onMoveDown?: () => unknown
}> = ({ groupId, rollCall, onEdit, onDelete, onMoveUp, onMoveDown }) => {
  const { data: users } = useUsersQuery({ groupId })
  const [activated, setActivated] = useState(false)

  if (!users) {
    return <Skeleton className='h-[9.25rem] animation-appear' />
  }

  const receivers = rollCall.usersPattern.split(',').map(userId => users.find(u => u.id === userId))

  return <Card className={cn(
    'overflow-hidden transition hover:shadow-lg',
    activated ? 'shadow-lg' : 'shadow-md',
  )}>
    <div className={cn('flex flex-col grow', !activated && 'cursor-pointer')} onClick={() => setActivated(!activated)}>
      {/* Header */}
      <CardHeader>
        <div className='flex flex-col gap-2'>
          <div className='overflow-hidden flex flex-row gap-1.5 items-baseline'>
            <span className='font-mono break-all'>{parseMessagePattern(rollCall.messagePattern)}</span>
          </div>

          {rollCall.pollOptions.length > 0 && (<>
            <Separator />

            <div className='flex flex-row items-baseline gap-1.5'>
              <LayoutList className='w-4 h-4 self-center shrink-0' />
              <span>Poll: {rollCall.pollOptions.map((option, i) => <Fragment key={i}>
                  {i > 0 && ', '}<PollOption option={option} />
              </Fragment>)}</span>
            </div>

            {!!rollCall.isMultiselectPoll && <>
              <div className='flex flex-row items-baseline gap-1.5'>
                <ListChecks className='w-4 h-4 self-center shrink-0' />
                <span>Multi-select poll</span>
              </div>
            </>}

            {!!rollCall.isAnonymousPoll && <>
              <div className='flex flex-row items-baseline gap-1.5'>
                <EyeOff className='w-4 h-4 self-center shrink-0' />
                <span>Anonymous poll</span>
              </div>
            </>}
          </>)}
        </div>
      </CardHeader>

      {/* Users */}
      <CardContent className='py-3 bg-secondary'>
        <div className='flex flex-col gap-2'>
          {rollCall.usersPattern === '*' && (
            <div className='flex flex-row items-baseline gap-1.5'>
              <CheckCheck className='w-4 h-4 self-center' />
              <span>Pings everyone in the chat</span>
            </div>
          )}

          {rollCall.usersPattern !== '*' && (<>
            <div className='grid grid-cols-2 gap-1'>
              {receivers.map((user, i) => (
                <UserName
                  key={user?.id}
                  className={cn(receivers.length % 2 !== 0 && i === receivers.length - 1 && 'col-span-full')}
                  user={user}
                />
              ))}
            </div>
          </>)}

          {!!rollCall.excludeSender && <>
            <Separator />

            <div className='flex flex-row items-baseline gap-1.5'>
              <UserMinus className='w-4 h-4 self-center' />
              <span>Sender is excluded</span>
            </div>
          </>}
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
        <Button className='rounded-none' size='icon' variant='link' onClick={onMoveUp} disabled={!onMoveUp}><ArrowUp /></Button>
        <Separator orientation='vertical' />
        <Button className='rounded-none' size='icon' variant='link' onClick={onMoveDown} disabled={!onMoveDown}><ArrowDown /></Button>
        <Separator orientation='vertical' />
        <Button className='grow basis-1 flex flex-row gap-2' variant='link' onClick={onEdit}>
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

export const RollCallSkeleton: FC = () => {
  return <Skeleton className='h-[9.25rem] animation-appear' />
}

const PollOption: FC<{ option: string }> = ({ option }) => {
  return <span className='whitespace-nowrap text-primary px-1 rounded-sm bg-primary/10'>{option}</span>
}

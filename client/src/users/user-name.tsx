import { cn } from '@/utils/cn'
import { User } from '@/users/types'
import { FC } from 'react'

export const UserName: FC<{ user: User | undefined; className?: string }> = ({ user, className }) => {
  const isUnknown = !user
  user ??= {
    id: 'unknown',
    name: 'Unknown',
    locale: 'en',
  }

  const showUsername: boolean = Boolean(user.username)

  return <div className={cn('flex items-baseline flex-row items-baseline gap-0.5', className)}
    title={user.username ? `${user.name} (@${user.username})` : user.name}>
    <span className={cn(
      'truncate leading-normal',
      isUnknown && 'italic',
    )}>
      <span className={cn(showUsername && 'pr-0.5')}>{user.name}</span>
    </span>
    {showUsername && <span className='truncate text-xs text-primary/70'>@{user.username}</span>}
  </div>
}

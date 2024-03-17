import { useRequiredAuth } from '@/auth/hooks'
import { useRecentUsersQuery } from './api'
import { useMemo } from 'react'

export function useRecentUsers() {
  const { currentUser } = useRequiredAuth()
  const { data: users } = useRecentUsersQuery()

  return useMemo(() => {
    return users
      ? [currentUser, ...users]
      : undefined
  }, [currentUser, users])
}

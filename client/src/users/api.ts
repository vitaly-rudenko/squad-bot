import { keepPreviousData, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { User } from '@/users/types'
import { authorizationHeaders, callApi } from '@/utils/api'
import { useRequiredAuth } from '@/auth/hooks'
import { unique } from '@/utils/unique'
import { MIN_QUERY_LENGTH } from './constants'

type SearchParameters = { groupId: string } | { userIds: string[] } | { query: string }

export const useUsersQuery = (input: SearchParameters, options?: Partial<UseQueryOptions<User[]>>) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['users', input],
    queryFn: async () => searchUsers(input, authToken),
    staleTime: input && 'userIds' in input ? Infinity : undefined,
    ...options,
  })
}

export const useUserQuery = (userId: string | undefined) => {
  const { data } = useUsersQuery(
    { userIds: userId ? [userId] : [] },
    { enabled: userId !== undefined }
  )

  return data?.at(0)
}

export const useRecentUsersQuery = () => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryKey: ['recent-users'],
    queryFn: async () => {
      const response = await callApi('/recent-users', {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      return response.json() as unknown as User[]
    }
  })
}

async function searchUsers(input: SearchParameters, authToken: string) {
  const search = new URLSearchParams()
  if ('groupId' in input) {
    search.set('group_id', input.groupId)
  } else if ('userIds' in input) {
    if (input.userIds.length === 0) return []
    for (const userId of unique(input.userIds).toSorted()) {
      search.append('user_ids[]', userId)
    }
  } else if ('query' in input) {
    if (input.query.length < MIN_QUERY_LENGTH) return []
    search.set('query', input.query)
  }

  const response = await callApi(`/users?${search.toString()}`, {
    method: 'GET',
    headers: authorizationHeaders(authToken),
  })

  return response.json() as unknown as User[]
}

import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { useQuery } from '@tanstack/react-query'
import { Group } from './types'

export const useGroupsQuery = (options: { page: number; perPage: number }) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['groups', options],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('page', String(options.page))
      search.set('per_page', String(options.perPage))

      const response = await callApi(`/groups?${search.toString()}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      const json = await response.json() as { items: unknown[]; total: number }
      return { items: json.items.map(deserialize), total: json.total }
    }
  })
}

export const useGroupQuery = (groupId: string) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await callApi(`/groups/${groupId}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      return deserialize(await response.json() as unknown)
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Group {
  return {
    id: raw.id,
    title: raw.title,
  }
}

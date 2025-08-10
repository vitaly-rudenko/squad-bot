import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { Link } from './types'

export const useLinksQuery = (options: { groupId: string; page: number; perPage: number }) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['links', options],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('page', String(options.page))
      search.set('per_page', String(options.perPage))

      if (options?.groupId) {
        search.set('group_id', options.groupId)
      }

      const response = await callApi(`/links?${search.toString()}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      const json = await response.json() as { items: unknown[]; total: number }
      return { items: json.items.map(deserialize), total: json.total }
    }
  })
}

export const useLinkQuery = (linkId: string, options: Partial<UseQueryOptions<Link>>) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['link', linkId],
    queryFn: async () => {
      const response = await callApi(`/links/${linkId}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      return deserialize(await response.json() as unknown)
    },
    ...options,
  })
}

type SaveLinkInput = {
  id?: number
  groupId: string
  label: string
  url: string
}

export const useSaveLinkMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: SaveLinkInput) => {
      const { id, groupId, ...body } = input

      await callApi(id ? `/links/${id}` : '/links', {
        method: id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authorizationHeaders(authToken),
        },
        body: JSON.stringify(id ? body : { groupId, ...body }),
      })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Link {
  return {
    id: raw.id,
    groupId: raw.groupId,
    label: raw.label,
    url: raw.url,
  }
}

export const useDeleteLinkMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (receiptId: string) => {
      await callApi(`/links/${receiptId}`, {
        method: 'DELETE',
        headers: authorizationHeaders(authToken)
      })
    }
  })
}

import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { useMutation, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { RollCall } from './types'

export const useRollCallsQuery = (options: { groupId: string; page: number; perPage: number }) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['roll-calls', options],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('page', String(options.page))
      search.set('per_page', String(options.perPage))

      if (options?.groupId) {
        search.set('group_id', options.groupId)
      }

      const response = await callApi(`/roll-calls?${search.toString()}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      const json = await response.json() as { items: unknown[]; total: number }
      return { items: json.items.map(deserialize), total: json.total }
    }
  })
}

export const useRollCallQuery = (rollCallId: string, options: Partial<UseQueryOptions<RollCall>>) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['roll-call', rollCallId],
    queryFn: async () => {
      const response = await callApi(`/roll-calls/${rollCallId}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      return deserialize(await response.json() as unknown)
    },
    ...options,
  })
}

type SaveRollCallInput = {
  id?: number
  groupId: string
  messagePattern: string
  usersPattern: string
  excludeSender: boolean
  pollOptions: string[]
  sortOrder: number
}

export const useSaveRollCallMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: SaveRollCallInput) => {
      const { id, groupId, ...body } = input

      await callApi(id ? `/roll-calls/${id}` : '/roll-calls', {
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

export const useSwapRollCallsMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: { rollCall1: RollCall, rollCall2: RollCall }) => {
      await Promise.all([
        callApi(`/roll-calls/${input.rollCall1.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authorizationHeaders(authToken),
          },
          body: JSON.stringify({ sortOrder: input.rollCall2.sortOrder }),
        }),
        callApi(`/roll-calls/${input.rollCall2.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authorizationHeaders(authToken),
          },
          body: JSON.stringify({ sortOrder: input.rollCall1.sortOrder }),
        })
      ])
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): RollCall {
  return {
    id: raw.id,
    groupId: raw.groupId,
    messagePattern: raw.messagePattern,
    usersPattern: raw.usersPattern,
    excludeSender: raw.excludeSender,
    pollOptions: raw.pollOptions,
    sortOrder: raw.sortOrder,
  }
}

export const useDeleteRollCallMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (receiptId: string) => {
      await callApi(`/roll-calls/${receiptId}`, {
        method: 'DELETE',
        headers: authorizationHeaders(authToken)
      })
    }
  })
}

import { useRequiredAuth } from '@/auth/hooks'
import { callApi, authorizationHeaders } from '@/utils/api'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Admin } from './types'

export const useAdminsQuery = (groupId: string) => {
  const { authToken } = useRequiredAuth()

  return useQuery({
    queryKey: ['admins', groupId],
    queryFn: async () => {
      const search = new URLSearchParams()
      search.set('group_id', groupId)

      const response = await callApi(`/admins?${search.toString()}`, {
        method: 'GET',
        headers: authorizationHeaders(authToken),
      })

      return (await response.json() as unknown[]).map(deserialize)
    }
  })
}

type SaveAdminsInput = {
  groupId: string
  admins: {
    userId: string
    title: string
  }[]
}

export const useSaveAdminsMutation = () => {
  const { authToken } = useRequiredAuth()

  return useMutation({
    mutationFn: async (input: SaveAdminsInput) => {
      await callApi('/admins', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authorizationHeaders(authToken),
        },
        body: JSON.stringify(input),
      })
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(raw: any): Admin {
  return {
    userId: raw.userId,
    title: raw.title,
    editable: raw.editable,
    isCreator: raw.isCreator,
  }
}
